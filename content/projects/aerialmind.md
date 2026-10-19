---
title: AerialMind
summary: A lightweight drone software platform, exploring reliable autonomy with human oversight.
category: Robotics & AI
status: Building
featured: true
order: 1
tags: [Python, C++, ROS 2, YOLO]
repository: https://github.com/omkarjoshi0304/aerialmind
---
## The idea

AerialMind is my ongoing side project exploring a lightweight, containerized drone software platform that can run on standard commercial hardware. It brings together perception, navigation, and human oversight.

## What I’m working on

- Integrating object tracking with YOLO and visual navigation with ORB-SLAM3 and ROS 2.
- Exploring dynamic resource allocation between high-speed tracking and compute-intensive visual-inertial odometry.
- Building policy-based fallback behaviour for situations where the connection to the ground control station is lost.

## Human oversight by design

YAML-based policies define pre-approved fallback behaviours, with human-in-the-loop controls guiding how the system responds when connectivity is interrupted.

This project is in progress. The repository is the place to follow its implementation as it develops.
