import React from "react";
import { continents } from "countries-list";

interface ContinentFlagProps {
  code: string;
}

const ContinentFlag = ({ code }: ContinentFlagProps) => {
  const continentCode = code.toUpperCase();
  const continent = continents[continentCode as keyof typeof continents];

  if (!continent) {
    return (
      <div className="flex items-center space-x-2">
        <span>Unknown</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span>{continent}</span>
    </div>
  );
};

export default ContinentFlag;
