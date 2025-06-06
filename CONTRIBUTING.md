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
  openjdk version "21.0.7" 2025-04-15 LTS
  ```

- Ensure Maven >= 3.9.9 is installed and included in the `PATH` environment variable.

  ```console
  $ mvn -version
  Apache Maven 3.9.9 (8e8579a9e76f7d015ee5ec7bfcdc97d260186937)
  ```

### IDE configuration

See [IDE configuration](https://jenkins.io/doc/developer/development-environment/ide-configuration/).

### Debugging in Visual Studio Code

This repository comes preconfigured for debugging in [Visual Studio Code](https://code.visualstudio.com/). Beyond Java and Maven, you will need:

- The [recommended extensions](./.vscode/extensions.json) for Visual Studio Code
- Node.js and NPM installed and in `PATH` (check recommended versions in [`pom.xml`](./pom.xml) > `properties`)
- Frontend dependencies installed with `npm install`

Then, in the [_Debug_ view](https://code.visualstudio.com/docs/debugtest/debugging), you can select between:

- _Debug Frontend_ to debug the frontend code in a browser
- _Debug Java_ to debug the Java code
- _Debug All_ to debug both at the same time

When launching one of these, Visual Studio Code will automatically start the required tasks, such as `npm run build:dev` and `mvn hpi:run -Dskip.npm -P quick-build`.

https://github.com/user-attachments/assets/709e29b4-ac1c-47da-bcc4-30eda7dcc266

Both frontend and Java tests can also be ran and debugged through the [Test view](https://code.visualstudio.com/docs/debugtest/testing).

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
