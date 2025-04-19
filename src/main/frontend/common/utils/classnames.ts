export function classNames(...inputs: ClassInput[]): string {
  return inputs
    .flatMap((item) => {
      if (typeof item === "string") return item;
      return Object.entries(item)
        .filter(([_, value]) => value)
        .map(([className]) => className);
    })
    .join(" ");
}

type ClassInput = string | { [className: string]: boolean | undefined };
