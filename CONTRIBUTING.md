# Contributing

**Never report security issues on GitHub, public Jira issues or other public channels (Gitter/Twitter/etc.),
follow the instruction from [Jenkins Security](https://www.jenkins.io/security/#reporting-vulnerabilities) to
report it on [Jenkins Jira](https://issues.jenkins.io/)**

In the Jenkins project we appreciate any kind of contributions: code, documentation, design, etc.
Any contribution counts, and the size does not matter!
Check out [this page](https://jenkins.io/participate/) for more information and links!

Many plugins and components also define their own contributing guidelines and communication channels.
There is also a big number of [mailing lists](https://jenkins.io/mailing-lists/) and [chats](https://jenkins.io/chat/).

## Newcomers

If you are a newcomer contributor and have any questions, please do not hesitate to ask in the [Newcomers Gitter channel](https://gitter.im/jenkinsci/newcomer-contributors).

## Useful links

- [Jenkins: Participate and Contribute](https://jenkins.io/participate/)
- [Slides: Contributing to Jenkins - it is all about you](https://docs.google.com/presentation/d/1JHgVzWZAx95IsUAZp8OoyCQGGkrCjzUd7eblwd1Y-hA/edit?usp=sharing)

### Source code contribution ways of working

- For larger contributions create an issue for any required discussion
- Implement solution on a branch in your fork
- Make sure to include issue ID (if created) in commit message, and make the message speak for itself
- Once you're done create a pull request and ask at least one of the maintainers for review
  - Remember to title your pull request properly as it is used for release notes

## Run Locally

Prerequisites: _Java_ and _Maven_.

- Ensure Java 17 or 21 is available.

  ```console
  $ java -version
  openjdk 17.0.13 2024-10-15
  OpenJDK Runtime Environment (build 17.0.13+11-Ubuntu-2ubuntu124.04)
  OpenJDK 64-Bit Server VM (build 17.0.13+11-Ubuntu-2ubuntu124.04, mixed mode, sharing)
  ```

- Ensure Maven >= 3.9.9 is installed and included in the PATH environment variable.

  ```console
  mvn --version
  ```

### IDE configuration

See [IDE configuration](https://jenkins.io/doc/developer/development-environment/ide-configuration/)

### CLI

```console
mvn hpi:run
```

```text
...
INFO: Jenkins is fully up and running
```

### Building frontend code

To work on the frontend code, two processes are needed at the same time:

On one terminal, start a development server that will not process frontend assets:

```sh
mvn hpi:run -Dskip.npm -P quick-build
```

On another terminal, start a [vite](https://vite.dev/) build command that automatically rebuilds on code changes:

```sh
npm run build:dev
```

It's recommended that you set up the above terminal commands in your IDE of choice.

### Build and package

To generate the hpi package and run the test you can use:

```sh
mvn package
```

For a quicker build without the tests run:

```sh
mvn package -P quick-build
```

### Code style

Code style will be enforced by GitHub pull request checks.

For frontend code we use [prettier](https://prettier.io/) and [eslint](https://eslint.org).

You can automatically fix issues with `npm run format && npm run eslint:fix`

For java code we use [spotless](https://github.com/diffplug/spotless).

You can automatically fix issues with `mvn spotless:apply`
