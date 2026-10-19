# Pre-hosting review — 19 October 2026

The code and content review is complete. The site builds successfully and all
20 automated tests pass. It is ready for a hosting preview, with the browser,
dependency-audit, and Go execution checks below still outstanding. Those
checks were attempted; environment restrictions prevented their completion.
This is a scoped engineering review, not a security certification or a full
accessibility audit.

**Findings fixed during the review**

| Priority | Finding and impact | Resolution |
| --- | --- | --- |
| Medium | Tests rebuilt the live `dist/` directory and briefly wrote a verification post into the actual content directory. With the development watcher running, this could cause `ENOTEMPTY` build failures or display test content. | Added isolated build/output options. Both test suites now use temporary output, and publishing tests use copied temporary posts. Added regression coverage for separate builds and preserving the last build after invalid content. See [build.mjs](scripts/build.mjs) and [site.test.mjs](tests/site.test.mjs). |
| Medium | Security headers existed only in the Node preview server and would be lost when uploading static files. | Added [http-headers.mjs](scripts/http-headers.mjs) as the shared policy and generate `dist/_headers` for Netlify and Cloudflare Pages. Added tests checking that static and local policies match. Production delivery still needs verification after deployment. |
| Medium | A missing build directory could reject a request rather than produce a usable response. | The preview handler now returns a short `503` response with `Retry-After`, including correct handling of HEAD requests. A regression test covers this. See [server.mjs](scripts/server.mjs). |
| Medium | Some small text did not reach a 4.5:1 contrast ratio. The dark theme's faint text measured 4.02:1, and dim diagram labels measured about 3.07:1. | Adjusted faint text to 4.75:1 against the page background. Diagram labels now exceed 5:1 against their card background; connectors were also brightened. The layout is unchanged. See [styles.css](public/styles.css) and the [architecture SVG](public/images/posts/aiapp-operator-architecture.svg). |
| Low | Published posts used generic website sharing metadata. | Blog pages now declare `og:type=article`, an author, and publication date. Publication tests cover this metadata. See [templates.mjs](src/templates.mjs). |
| Medium | Responsive browser checks covered the blog archive, but not the actual technical article with its long code blocks and diagram. | Added published article routes at all seven existing viewport widths, image loading, alt-text, and diagram-width checks to [browser.mjs](tests/browser.mjs). Execution remains blocked by browser startup, so this is coverage added, not a visual pass. |

The contrast target comes from the [W3C explanation of minimum text
contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Only the checked colour pairs are verified; this does not establish whole-site
WCAG conformance.

**Remaining findings and verification limits**

1. **Medium — dependency maintenance and live audit remain open.**
   `package.json` pins `js-yaml` 4.1.1. Upstream advisories describe denial of
   service in [merge-key handling](https://github.com/advisories/GHSA-h67p-54hq-rp68)
   and [ordered-map resolution](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj).
   This site parses locally authored content at build time with `JSON_SCHEMA`,
   which does not enable the cited features. Tests confirm merge keys do not
   supply metadata and `!!omap` is rejected. There is no visitor-facing YAML
   parser in the deployed static site. This limits current exposure but does
   not replace upgrading and auditing dependencies. `npm audit --json` could
   not contact the registry because DNS was unavailable; an attempted patched
   version lookup was also inconclusive with the available cached metadata.
   Re-run the audit with network access and install an available patched
   release compatible with the site. No dependency version was changed on
   unverified registry information.

2. **Medium — the operator tutorial has not been compiled or run on a cluster.**
   The Go controller blocks were combined and passed `gofmt` syntax checks.
   A temporary module was prepared for compilation, but required modules were
   unavailable offline and downloads failed with DNS errors. This is not a
   compiler pass. CRD generation, CEL validation, RBAC, API-server defaulting,
   reconciliation, and rollout behavior still need execution against the
   scaffolded project and a development cluster. Follow the article's steps,
   run `make generate`, `make manifests`, and `go test ./...`, and exercise its
   lifecycle table with a working application image before describing the
   tutorial as end-to-end tested.

3. **Medium — browser and device behavior remains unverified here.**
   Both installed Chrome and cached Chromium failed to launch before loading
   site content. `npm run test:browser` therefore did not execute its visual
   and interaction checks. Run it in a normal desktop environment and check
   phone and desktop layouts, scroll behavior, keyboard focus, theme switching,
   blog filters, article code scrolling, the full-size diagram link, and print
   output. No Lighthouse score, browser screenshot pass, or screen-reader
   compatibility claim is made.

4. **Launch configuration — verify the actual domain and host responses.**
   The local build intentionally uses localhost in RSS without a configured
   origin. Netlify Git builds now use its main site `URL` automatically, with
   `SITE_URL` taking precedence. Manual uploads need a local rebuild with the
   actual site address once assigned. Verify the deployed root, article route,
   SVG, feed, sitemap, HTTP headers, and a nonexistent URL returning status
   404. External GitHub and LinkedIn links could not be verified through the
   available browsing connection; check their public accessibility before
   announcing the site. A browsing error is not evidence that they are broken.

5. **Low — richer social previews are optional follow-up work.**
   Titles, descriptions, canonical links, and article metadata are present.
   A dedicated raster social-preview image is not configured. Adding one is
   useful for sharing the blog, but does not prevent the article from working.

**Website and code checks completed**

- `npm test`: **20 passed**. Coverage includes Markdown escaping, rejected
  unsafe URLs, metadata validation, restricted YAML features, publication,
  draft/future-post exclusion, internal links, server methods and errors,
  traversal and symlink containment, isolated builds, headers, deployment
  origins, and gallery progress including reduced motion.
- `npm run build`: **passed**, producing 11 HTML pages and one published post.
- JavaScript syntax checks: passed for the reviewed modules. Subsequent
  shared-header changes are exercised by the passing tests and build.
- Static checks across the 11 HTML pages: one H1 and main landmark per page,
  unique IDs, viewport/description metadata, nonempty image alt text, and
  external script files. These are structural checks, not browser evaluation.
- SVGs parse as XML; no script or foreign-object elements were found. The
  architecture diagram remains clickable and has a full-size text link and
  a caption explaining the ReplicaSet relationship.
- Internal links and assets resolve. The draft template is excluded from
  public pages and RSS. Source modules and package files are not copied into
  the public output.
- Basic credential-pattern checks found no matching embedded private keys,
  GitHub token pattern, or AWS access-key pattern in the reviewed source and
  content. This was not a comprehensive secret-scanner run.
- Public source assets total about 70 KiB before compression; generated HTML
  is additional. There is no client framework bundle, external font download,
  analytics script, or visitor backend in this version. Runtime performance
  and layout shift were not measured.

**Blog review**

The article's scope is clear: a generic external-model AI API managed by a
small operator. It does not claim to deploy model weights or implement the
retrieval service itself. It distinguishes infrastructure readiness from AI
answer quality and does not invent personal production results.

On code inspection, the controller fetches the primary resource, ignores
deletion-related NotFound responses, skips objects being deleted, reconciles
owned children, rejects unrelated name collisions, and patches status only
when changed. It preserves server-assigned Service fields and avoids replacing
the whole Pod template. Readiness includes Deployment generation and replica
counts. The article explains Secret rotation limitations and the difference
between controller tests and a real cluster.

These patterns were compared with the official [controller-runtime
helpers](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil),
[Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/),
[Kubebuilder validation reference](https://book.kubebuilder.io/reference/markers/crd-validation.html),
and [envtest guidance](https://book.kubebuilder.io/reference/envtest.html).
Their presence in the article does not establish executable correctness.
The application image, model URL, and model ID are explicitly placeholders
and must be replaced to reproduce the walkthrough.

Profile and project content were compared with the supplied CV, not independently
verified as employment, credential, or project-performance claims. The résumé
already groups qualifications under “Training & certifications”; DO188 is a
course code, and the site does not claim an EX188 exam pass.

**Easiest hosting route**

For the first deployment, Netlify Drop accepts the built `dist` folder without
requiring a Git repository. Its [free plan](https://www.netlify.com/pricing/)
has usage limits. Later, connecting a repository automates builds and updates;
[netlify.toml](netlify.toml) supplies the Node version, build command, and output
directory. See [Netlify deployment options](https://docs.netlify.com/deploy/create-deploys/),
[custom headers](https://docs.netlify.com/manage/routing/headers/), and
[build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/).

No deployment, account change, Git commit, or push was performed. The generated
header policy and Netlify settings are prepared locally; the actual hosted
responses still need checking once a preview exists.
