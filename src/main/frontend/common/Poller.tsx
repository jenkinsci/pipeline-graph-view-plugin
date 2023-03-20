interface IPoller<Type> {
  functionToPoll: () => Promise<Type>;
  checkSuccess: (data: Type) => boolean;
  onSuccess: (data: Type) => void;
  checkComplete: (data: Type) => boolean;
  onComplete: () => void;
  interval: number;
}

/**
 * A generic polling function to make it easier to share polling code.
 * Starts a timer to call a polling function every interval.
 * Will only stop once 'checkComplete' returns true.
 */
export function pollUntilComplete<Type>(props: IPoller<Type>) {
  async function pollFunction() {
    const res = await props.functionToPoll();
    if (props.checkSuccess(res)) {
      props.onSuccess(res);
    }
    if (props.checkComplete(res)) {
      props.onComplete();
    } else {
      setTimeout(() => pollFunction(), props.interval);
    }
  }
  pollFunction();
}
