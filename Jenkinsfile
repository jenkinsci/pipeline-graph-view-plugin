/*
 See the documentation for more options:
 https://github.com/jenkins-infra/pipeline-library/
*/
buildPlugin(
  useContainerAgent: true, // Set to `false` if you need to use Docker for containerized tests
  forkCount: '1C',
  configurations: [
    [platform: 'linux', jdk: 25],
    [platform: 'linux', jdk: 21],
])
