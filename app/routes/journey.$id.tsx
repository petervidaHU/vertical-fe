import { useParams } from "react-router";

export default function JourneyPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Journey: {id}</h1>
    </div>
  );
}
