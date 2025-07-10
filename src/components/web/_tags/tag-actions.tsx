"use client";
import CreateTagForm from "./create-tag-dialog";

interface ActionsProps {
  workspaceslug: string;
}

const Actions = ({ workspaceslug }: ActionsProps) => {
  // const [value, setValue] = useState("");
  return (
    <div className="flex items-center justify-end">
      <CreateTagForm workspaceslug={workspaceslug} />
    </div>
  );
};

export default Actions;
