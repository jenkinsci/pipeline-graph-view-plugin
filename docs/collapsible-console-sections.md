# Collapsible Console Sections

Steps in the Pipeline Graph View console can collapse sections of their output into expandable groups. This makes long logs easier to scan.

## Using markers in your Jenkinsfile

Add `##[group]` and `##[endgroup]` markers to your shell commands. The text after `##[group]` becomes the section title.

```groovy
stage('Test') {
    steps {
        sh '''
            echo "##[group]Unit Tests"
            ./run-tests.sh
            echo "##[endgroup]"

            echo "##[group]Integration Tests"
            ./run-integration.sh
            echo "##[endgroup]"
        '''
    }
}
```

Both Azure DevOps (`##[group]`) and GitHub Actions (`::group::`) syntax are supported and can be mixed freely.

```groovy
sh '''
    echo "::group::Dependency install"
    npm ci
    echo "::endgroup::"
'''
```

## Behavior

- Sections with more than 25 lines start collapsed.
- Sections with 25 or fewer lines start open.
- Sections still being written (not yet closed) stay open.
- Sections can be nested.
- Lines from `set -x` shell tracing (starting with `+ `) are never treated as markers.

## Colored titles (AnsiColor plugin)

If you install the [AnsiColor plugin](https://plugins.jenkins.io/ansicolor/), wrap your step in `ansiColor('xterm')`. ANSI codes in section titles are rendered as colors.

```groovy
stage('Build') {
    steps {
        ansiColor('xterm') {
            sh '''#!/bin/bash
                echo -e "\033[32m##[group]Dependencies\033[0m"
                npm ci
                echo "##[endgroup]"

                echo -e "##[group]\033[1;34mCompile\033[0m"
                npm run build
                echo "##[endgroup]"
            '''
        }
    }
}
```

Note: use `echo -e` in bash (not the default `sh`) so escape sequences are interpreted. Add `#!/bin/bash` at the top of your `sh` block.
