import "./skeleton.scss";

export default function Skeleton({ height }: { height?: number }) {
  return (
    <div
      className={"pgv-skeleton"}
      style={
        height
          ? {
              height: `${height}rem`,
            }
          : {}
      }
    />
  );
}
