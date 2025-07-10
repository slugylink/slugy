import React from "react";
import Flag from "react-world-flags";
import { countries } from "countries-list";

interface CountryFlagProps {
  code: string; // ISO 3166-1 alpha-2 country code (e.g., "US", "IN")
  size?: number; // Optional size for the flag icon
  allowCountry?: boolean;
}

const CountryFlag = ({
  code,
  size = 18,
  allowCountry = true,
}: CountryFlagProps) => {
  const countryCode = code.toUpperCase();
  const country = countries[countryCode as keyof typeof countries];

  if (!country) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm">🏳️</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Flag code={code} style={{ width: size, height: size }} />
      {allowCountry && <span>{country.name}</span>}
    </div>
  );
};

export default CountryFlag;
