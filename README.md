# Pipeline Graph View Plugin

[![Build Status](https://ci.jenkins.io/job/Plugins/job/pipeline-graph-view-plugin/job/main/badge/icon)](https://ci.jenkins.io/job/Plugins/job/pipeline-graph-view-plugin/job/main/)
[![Gitter](https://badges.gitter.im/jenkinsci/ux-sig.svg)](https://gitter.im/jenkinsci/ux-sig?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![Jenkins Plugin](https://img.shields.io/jenkins/plugin/v/pipeline-graph-view.svg)](https://plugins.jenkins.io/pipeline-graph-view)
[![Jenkins Plugin Installs](https://img.shields.io/jenkins/plugin/i/pipeline-graph-view.svg?color=blue)](https://plugins.jenkins.io/pipeline-graph-view)

![preview.png](docs/images/preview.png)

## Introduction

This plugin adds a visual representation of Jenkins pipelines, showing each stage of a run in a clear and easy-to-follow graph format. It’s designed to make pipeline progress and structure easier to understand at a glance.

## Features

- Visualize pipelines as an interactive, nested graph
- Navigate pipeline stages in a clear, collapsible list view
- View logs in real time without leaving the interface
- Toggle between graph and stage views; move and resize panes to suit your workflow
- Quickly access details of each step and its results
- Designed for better readability and faster troubleshooting

## Getting started

1. Install the [pipeline-graph-view](https://plugins.jenkins.io/pipeline-graph-view/) plugin
2. Go to a pipeline run (not a job page)
3. Click 'Pipeline Console'

## Screenshots

Basic pipeline:

![Different statuses](./docs/images/different-statuses.png)

Semi-complex pipeline:

![Semi complex pipeline](./docs/images/semi-complex-pipeline.png)

## Video

See a live demonstration from a Jenkins Contributor Summit:

[![Demo of Pipeline Graph View plugin](https://img.youtube.com/vi/MBI3MBY2eJ8/0.jpg)](https://www.youtube.com/watch?v=MBI3MBY2eJ8&t=3295 "Pipeline Graph View plugin")

## Contributing

Refer to our [contribution guidelines](./CONTRIBUTING.md).

## LICENSE

Licensed under MIT, see [LICENSE](LICENSE.md).
