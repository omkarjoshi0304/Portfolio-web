---
title: Building a Kubernetes Operator in Go for an AI Application
summary: Turn an AI service into a Kubernetes API, then use Go and Kubebuilder to manage its deployment, configuration, and readiness.
date: '2026-10-19'
tags: [Kubernetes, Go, AI, Platform Engineering]
draft: false
---

An AI application can start with a small API and a call to a model. Running it reliably introduces another set of questions: where do credentials come from, how do configuration changes reach the workload, and what happens when someone deletes a resource it depends on?

This is where my interests in AI application development and platform engineering meet. I want application developers to describe what they need, and the platform to take care of keeping it running.

In this walkthrough, we will design a small Kubernetes Operator in Go for an AI API. We will use Kubebuilder to create the project, define an `AIApp` custom resource, and write a controller that manages a Deployment and a Service.

The application calls an external model endpoint. Its retrieval logic, prompts, and vector database integration stay inside the application. The operator handles its Kubernetes lifecycle.

## Start with the API you want to offer

Imagine letting a developer deploy an AI service with this resource:

```yaml
apiVersion: ai.omkar.dev/v1alpha1
kind: AIApp
metadata:
  name: docs-assistant
  namespace: ai-demo
spec:
  image: YOUR_REGISTRY/YOUR_AI_APP:YOUR_TAG
  replicas: 2
  modelEndpoint: https://YOUR_MODEL_HOST/v1
  model: YOUR_MODEL_ID
  apiKeySecret: model-credentials
```

The uppercase values are placeholders. There is no prebuilt application image behind this example: substitute your own image and provider settings.

Our application contract is deliberately small. The container listens on port `8080`, reads `MODEL_ENDPOINT`, `MODEL_NAME`, and `MODEL_API_KEY`, and exposes `/livez` and `/readyz`. `/livez` indicates that the process has started; `/readyz` indicates that its initialization has completed and it can accept requests.

The operator translates the resource into this arrangement:

[![AIApp operator architecture: the reconciler manages a Deployment and Service; application Pods use a separately supplied Secret and call external model and retrieval services.](/images/posts/aiapp-operator-architecture.svg)](/images/posts/aiapp-operator-architecture.svg)

The Deployment manages Pods through a ReplicaSet. Tap the diagram or [open it at full size](/images/posts/aiapp-operator-architecture.svg) to read the labels on a smaller screen.

The Secret is supplied separately. The operator references it; it does not own it or copy its contents into the custom resource.

An operator extends Kubernetes with application-specific reconciliation logic. Before writing one, ask whether a Deployment and a Helm chart already cover the problem. I would reach for an operator when I need a domain-specific API and ongoing lifecycle decisions, such as coordinating configuration, checking dependencies, or managing upgrades. [Kubernetes explains the operator pattern here.](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)

## Scaffold the Go project

Install Go, Kubebuilder, and `kubectl`, and use a development cluster you can experiment with. Use the tool versions supported by your Kubebuilder release; keep the generated `go.mod` and `go.sum` with the project rather than independently upgrading Kubernetes dependencies. The [Kubebuilder quick start](https://book.kubebuilder.io/quick-start) covers installation and project generation.

```sh
mkdir aiapp-operator
cd aiapp-operator

kubebuilder init --domain omkar.dev --repo example.com/aiapp-operator
kubebuilder create api --group ai --version v1alpha1 --kind AIApp --resource --controller
```

`example.com/aiapp-operator` is an illustrative Go module path. Replace it with your repository path, and update the corresponding import in the controller below.

The main files we will edit are:

| File | Responsibility |
| --- | --- |
| `api/v1alpha1/aiapp_types.go` | Define the application's desired state and observed status. |
| `internal/controller/aiapp_controller.go` | Reconcile the Kubernetes resources. |
| `config/samples/ai_v1alpha1_aiapp.yaml` | Describe one application instance. |

Kubebuilder also generates the manager entry point, scheme registration, manifests, and test scaffolding. Keep those generated pieces.

## Define desired state and observed state

In `api/v1alpha1/aiapp_types.go`, replace the generated `AIAppSpec` and `AIAppStatus` definitions with the following. The scaffold already imports `metav1`.

```go
type AIAppSpec struct {
	// +kubebuilder:validation:MinLength=1
	Image string `json:"image"`

	// +optional
	// +kubebuilder:default=2
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=10
	Replicas *int32 `json:"replicas,omitempty"`

	// +kubebuilder:validation:Pattern="^https://"
	ModelEndpoint string `json:"modelEndpoint"`

	// +kubebuilder:validation:MinLength=1
	Model string `json:"model"`

	// Name of a Secret in the same namespace, containing an api-key entry.
	// +kubebuilder:validation:MinLength=1
	APIKeySecret string `json:"apiKeySecret"`
}

type AIAppStatus struct {
	// +optional
	ReadyReplicas int32 `json:"readyReplicas,omitempty"`

	// +optional
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}
```

Keep the generated `AIApp` and `AIAppList` types, their registration, and the `+kubebuilder:subresource:status` marker. Add `// +required` immediately above the `Spec` field in `AIApp` so the API rejects a resource with no specification. Add these markers immediately above the `AIApp` type alongside its existing markers:

```go
// +kubebuilder:validation:XValidation:rule="size(self.metadata.name) <= 63",message="name must be 63 characters or fewer"
// +kubebuilder:validation:XValidation:rule="self.metadata.name.matches('^[a-z]([-a-z0-9]*[a-z0-9])?$')",message="name must be a DNS label starting with a letter"
```

We reuse the resource name in a Service and in label values, so this example requires a DNS label starting with a letter, with a maximum length of 63 characters. The endpoint pattern is a basic HTTPS prefix check; it does not verify the URL, provider, or network access.

`spec` is the developer's request. `status` is the controller's observation. Separating them lets someone distinguish “two replicas requested” from “two replicas available.” The validation and default markers become part of the generated CRD schema. [Kubebuilder documents these markers here.](https://book.kubebuilder.io/reference/markers/crd-validation.html)

Regenerate the deepcopy code and manifests after changing the API:

```sh
make generate
make manifests
```

## Write a reconciliation loop

The controller can run many times for the same resource. Each call should inspect the current state and move it toward the desired state. It should also be safe when the resource is already correct.

For this example, replace `internal/controller/aiapp_controller.go` with the following code. It is split into three blocks for readability; put all three in that file, in order.

The first block loads the resource, reconciles its children, and updates its status:

```go
package controller

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/equality"
	meta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	aiv1alpha1 "example.com/aiapp-operator/api/v1alpha1"
)

type AIAppReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=ai.omkar.dev,resources=aiapps,verbs=get;list;watch
// +kubebuilder:rbac:groups=ai.omkar.dev,resources=aiapps/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=ai.omkar.dev,resources=aiapps/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch

func (r *AIAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	var app aiv1alpha1.AIApp
	if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if !app.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	replicas := int32(2)
	if app.Spec.Replicas != nil {
		replicas = *app.Spec.Replicas
	}
	labels := map[string]string{"ai.omkar.dev/app": app.Name}

	deployment, err := r.reconcileDeployment(ctx, &app, replicas, labels)
	if err != nil {
		return ctrl.Result{}, err
	}
	if err := r.reconcileService(ctx, &app, labels); err != nil {
		return ctrl.Result{}, err
	}

	before := app.DeepCopy()
	app.Status.ReadyReplicas = deployment.Status.ReadyReplicas
	ready := deployment.Status.ObservedGeneration >= deployment.Generation &&
		deployment.Status.UpdatedReplicas == replicas &&
		deployment.Status.Replicas == replicas &&
		deployment.Status.ReadyReplicas == replicas &&
		deployment.Status.AvailableReplicas == replicas

	condition := metav1.Condition{
		Type: "Ready", Status: metav1.ConditionFalse,
		Reason: "RollingOut", Message: "Waiting for the desired replicas to become available",
		ObservedGeneration: app.Generation,
	}
	if ready {
		condition.Status = metav1.ConditionTrue
		condition.Reason = "DeploymentAvailable"
		condition.Message = "The desired deployment replicas are available"
	}
	meta.SetStatusCondition(&app.Status.Conditions, condition)
	if !equality.Semantic.DeepEqual(before.Status, app.Status) {
		if err := r.Status().Patch(ctx, &app, client.MergeFrom(before)); err != nil {
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}
```

`client.IgnoreNotFound` lets reconciliation finish normally after the custom resource has been deleted. Other API errors are returned so the controller can retry. Checking the deletion timestamp prevents us from recreating children while their parent is being removed.

Readiness checks both the Deployment's observed generation and its replica counts. Otherwise, healthy Pods from an older rollout could be mistaken for a completed update. The custom resource's condition records the `AIApp` generation that was reconciled; consumers should check that generation as well as the condition value. [The Deployment documentation describes rollout status](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), and [`SetStatusCondition` manages condition updates](https://pkg.go.dev/k8s.io/apimachinery/pkg/api/meta#SetStatusCondition).

## Reconcile the Deployment

Append this block to the same controller file:

```go
func (r *AIAppReconciler) reconcileDeployment(
	ctx context.Context, app *aiv1alpha1.AIApp, replicas int32, labels map[string]string,
) (*appsv1.Deployment, error) {
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: app.Name, Namespace: app.Namespace},
	}
	_, err := controllerutil.CreateOrPatch(ctx, r.Client, deployment, func() error {
		if !deployment.CreationTimestamp.IsZero() && !metav1.IsControlledBy(deployment, app) {
			return fmt.Errorf("deployment %s already exists and is not owned by this AIApp", app.Name)
		}
		if err := controllerutil.SetControllerReference(app, deployment, r.Scheme); err != nil {
			return err
		}
		deployment.Spec.Replicas = &replicas
		if deployment.Spec.Selector == nil {
			deployment.Spec.Selector = &metav1.LabelSelector{MatchLabels: labels}
		}
		if deployment.Spec.Template.Labels == nil {
			deployment.Spec.Template.Labels = map[string]string{}
		}
		for key, value := range labels {
			deployment.Spec.Template.Labels[key] = value
		}
		pod := &deployment.Spec.Template.Spec
		pod.AutomountServiceAccountToken = ptr.To(false)

		index := -1
		for i := range pod.Containers {
			if pod.Containers[i].Name == "app" {
				index = i
				break
			}
		}
		if index == -1 {
			pod.Containers = append(pod.Containers, corev1.Container{Name: "app"})
			index = len(pod.Containers) - 1
		}
		container := &pod.Containers[index]
		container.Image = app.Spec.Image
		container.Ports = []corev1.ContainerPort{{
			Name: "http", ContainerPort: 8080, Protocol: corev1.ProtocolTCP,
		}}
		container.Env = []corev1.EnvVar{
			{Name: "MODEL_ENDPOINT", Value: app.Spec.ModelEndpoint},
			{Name: "MODEL_NAME", Value: app.Spec.Model},
			{Name: "MODEL_API_KEY", ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: app.Spec.APIKeySecret},
					Key:                  "api-key",
				},
			}},
		}
		container.Resources = corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("250m"),
				corev1.ResourceMemory: resource.MustParse("256Mi"),
			},
			Limits: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("1"),
				corev1.ResourceMemory: resource.MustParse("1Gi"),
			},
		}
		container.StartupProbe = httpProbe("/livez", 60)
		container.ReadinessProbe = httpProbe("/readyz", 3)
		return nil
	})
	return deployment, err
}

func httpProbe(path string, failures int32) *corev1.Probe {
	return &corev1.Probe{
		ProbeHandler: corev1.ProbeHandler{HTTPGet: &corev1.HTTPGetAction{
			Path: path, Port: intstr.FromInt32(8080), Scheme: corev1.URISchemeHTTP,
		}},
		TimeoutSeconds: 2, PeriodSeconds: 5,
		SuccessThreshold: 1, FailureThreshold: failures,
	}
}
```

`CreateOrPatch` reads the current object, runs our mutation function, and creates or patches it when necessary. A resource with the same name that belongs to someone else produces an error instead of being silently adopted. Setting a controller reference gives the Deployment an owner and connects its events to its `AIApp`. [See the controller-runtime helper documentation.](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil)

Notice that we update selected fields on the existing Pod template and find our container by name. Replacing the entire template on every reconciliation can discard unrelated fields and undo API defaults or admission changes. Defaults also matter for repeated patches: for example, leaving a desired replica count nil while the API defaults it to one can create unnecessary writes.

The CPU and memory values above are starting points for a small API that calls an external model, not measurements or sizing advice for inference servers. Adapt them to your application. A self-hosted model would need a different design for GPUs, model storage, scheduling, and loading time.

The startup probe allows roughly five minutes for the process to start. The readiness probe controls whether a Pod receives Service traffic. Keep these endpoints cheap; making every probe perform an inference request adds cost and can turn a provider outage into a health-check storm. [Kubernetes distinguishes startup, readiness, and liveness probes here.](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Add a Service and watch the resources we own

Append the final block:

```go
func (r *AIAppReconciler) reconcileService(
	ctx context.Context, app *aiv1alpha1.AIApp, labels map[string]string,
) error {
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: app.Name, Namespace: app.Namespace},
	}
	_, err := controllerutil.CreateOrPatch(ctx, r.Client, service, func() error {
		if !service.CreationTimestamp.IsZero() && !metav1.IsControlledBy(service, app) {
			return fmt.Errorf("service %s already exists and is not owned by this AIApp", app.Name)
		}
		if err := controllerutil.SetControllerReference(app, service, r.Scheme); err != nil {
			return err
		}
		service.Spec.Type = corev1.ServiceTypeClusterIP
		service.Spec.Selector = labels
		service.Spec.Ports = []corev1.ServicePort{{
			Name: "http", Port: 80, TargetPort: intstr.FromInt32(8080),
			Protocol: corev1.ProtocolTCP,
		}}
		return nil
	})
	return err
}

func (r *AIAppReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aiv1alpha1.AIApp{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Complete(r)
}
```

We preserve Service fields assigned by Kubernetes, including its cluster IP. Watching owned Deployments and Services means a rollout update or a deleted child can enqueue another reconciliation. The Deployment controller manages the Pods; our controller manages the desired Deployment. [Kubebuilder explains these watches here.](https://book.kubebuilder.io/reference/watching-resources.html)

When the `AIApp` is deleted, Kubernetes can garbage-collect these owned resources. The operator does not own the supplied Secret. External resources, such as a database created through a cloud API, need a separate deletion design, often using a finalizer. [Read about ownership](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/) and [finalizers](https://book.kubebuilder.io/reference/using-finalizers.html).

## Run it against a development cluster

Regenerate the API artifacts and RBAC, then install the CRD and run the controller locally:

```sh
make generate
make manifests
make install
make run
```

These commands use your current kubeconfig context. Keep `make run` open and use a second terminal for the application resources.

```sh
kubectl create namespace ai-demo
kubectl -n ai-demo create secret generic model-credentials \
  --from-file=api-key=./model-api-key.txt
```

Supply `model-api-key.txt` locally, keep it out of version control, and do not paste a real credential into the article's YAML. The Secret must be in the application's namespace and contain the `api-key` entry. Environment variables populated from a Secret do not automatically update in running containers when the Secret changes; plan a rollout or another rotation mechanism. [The Kubernetes credential guide explains this behavior.](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/)

Save the example resource from the start of the article to `config/samples/ai_v1alpha1_aiapp.yaml`, replacing the image, endpoint, and model placeholders. The image must implement the application contract and be pullable by the cluster.

```sh
kubectl apply -f config/samples/ai_v1alpha1_aiapp.yaml
kubectl -n ai-demo get aiapps.ai.omkar.dev,deployments,services
kubectl -n ai-demo rollout status deployment/docs-assistant --timeout=180s
kubectl -n ai-demo get aiapp docs-assistant -o yaml
kubectl -n ai-demo port-forward service/docs-assistant 8080:80
```

The Service is internal. Port forwarding provides local access without adding a public ingress. If rollout fails, inspect the Deployment and Pod events: a missing Secret, a bad image reference, or a failing readiness endpoint are useful failure cases to work through.

Changing `spec.model` or `spec.modelEndpoint` changes the Pod template and triggers a Deployment rollout. Changing `spec.replicas` changes the desired replica count. Direct edits to the fields this operator manages will be reconciled back to the custom resource's desired state.

## Test the lifecycle, including the second reconciliation

Creating resources once is the first test. I would also exercise these cases:

| Change or failure | Expected behavior |
| --- | --- |
| Reconcile an unchanged resource again | No unnecessary child or status patches. |
| Change the image or model setting | The Pod template changes and the rollout becomes ready only after the new generation is observed. |
| Delete the owned Service | The controller recreates it. |
| Put an unrelated Deployment at the intended name | Reconciliation returns an ownership error without taking it over. |
| Reference a missing Secret | Pods fail to start and the application does not become ready. |
| Delete the `AIApp` | Owned resources are removed; the independently supplied Secret remains. |

Use unit tests for object construction and repeated reconciliation, `envtest` for API-server behavior such as validation and status updates, and a real development cluster for Deployment rollouts, probes, and garbage collection. `envtest` does not run the Kubernetes controller manager, so creating a Deployment there does not cause Pods to appear. [The envtest documentation describes that boundary.](https://book.kubebuilder.io/reference/envtest.html)

Once the local flow works, the scaffold's `make docker-build docker-push IMG=...` and `make deploy IMG=...` commands package and install the operator itself. This image is separate from the AI application's image. Keep both versioned. [The quick start covers in-cluster deployment.](https://book.kubebuilder.io/quick-start)

## Where I would take this next

This is a small controller to make the lifecycle visible. The next decisions depend on the application: namespace-scoped manager permissions, workload security settings, dependency conditions, credential rotation, and an upgrade policy. Review the generated RBAC rather than assuming the sample's cluster-wide manager configuration is suitable everywhere. The controller does not need to read Secret contents just to put a Secret reference in a Pod spec. [Kubernetes documents Secret access considerations here.](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)

For a RAG service, I would also decide who owns the vector database and ingestion jobs, how schema or index changes are coordinated, and whether updates need an evaluation gate before receiving traffic. Two controllers should not independently manage the same fields; for example, adding an HPA would require changing this controller's ownership of `Deployment.spec.replicas`.

The `Ready` condition in this example describes infrastructure readiness. It says nothing about grounding, answer correctness, or model quality. Those need their own evaluation process, test datasets, and release criteria.

What interests me about operators is the API they create for a team. A developer can ask for an AI application using a resource that matches the application domain, and the platform can keep working toward that request as the cluster changes.
