/**
 * Reset JS environment set up by prototype.js to not interfere with
 * our react components.
 *
 * @see https://github.com/jenkinsci/jenkins/blob/75468da366c1d257a51655dcbe952d55b8aeeb9c/war/src/main/js/util/jenkins.js#L22
 */
export function resetEnvironment() {
    if ((Array.prototype as any).toJSON) {
      delete (Array.prototype as any).toJSON;
      delete (Object.prototype as any).toJSON;
      /*
      if (window.Hash) {
        delete (Hash.prototype as any).toJSON;
      } 
      */ 
      delete (String.prototype as any).toJSON;
    }
  }