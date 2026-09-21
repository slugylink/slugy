"use client";

import UtmTemplateForm from "./create-utm-template-dialog";

interface ActionsProps {
  workspaceslug: string;
}

const Actions = ({ workspaceslug }: ActionsProps) => {
  return (
    <div className="flex items-center justify-end">
      <UtmTemplateForm workspaceslug={workspaceslug} />
    </div>
  );
};

export default Actions;
