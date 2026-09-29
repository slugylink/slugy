import React from "react";
import { continents } from "countries-list";

interface ContinentFlagProps {
  code: string;
}

/** 2-letter code → name, plus full slugs (grouping keys are slugs). */
const SLUG_TO_CODE: Record<string, string> = {
  africa: "AF",
  antarctica: "AN",
  asia: "AS",
  europe: "EU",
  "north america": "NA",
  oceania: "OC",
  "south america": "SA",
};

const ContinentFlag = ({ code }: ContinentFlagProps) => {
  const trimmed = code.trim();
  const continentCode =
    SLUG_TO_CODE[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
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
