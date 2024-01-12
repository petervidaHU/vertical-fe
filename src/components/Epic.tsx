import { iStoryEntity } from "@type/story.interface";

type Props = {
  scrollPosition: number,
  epic: iStoryEntity,
}

const Epic: React.FC<Props> = ({
  scrollPosition,
  epic: {
    title,
    description,
    startPoint,
    endPoint
  }
}) => {
  return (
    <div
    className="mt-1 max-w-1/2 bg-teal-800 p-5 text-white rounded-md"
  >
    <p className="font-bold text-2xl">{title}</p>
    <p>{description}</p>
    <p>from: {startPoint}</p>
    <p>to: {endPoint}</p>
  </div>
  );
}

export default Epic;