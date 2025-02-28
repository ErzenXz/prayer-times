"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft } from "lucide-react";

interface CountrySelectorProps {
  onSelect: (country: string, city: string) => void;
}

export default function CountrySelector({ onSelect }: CountrySelectorProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string>("");
  
  const countries = [
    { code: "XK", name: "Kosovo", flag: "🇽🇰" },
    { code: "AL", name: "Albania", flag: "🇦🇱" },
    { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  ];
  
  const cities = {
    XK: [
      { name: "Pristina", code: "Pristina" },
      { name: "Prizren", code: "Prizren" },
      { name: "Peja", code: "Peja" },
      { name: "Gjakova", code: "Gjakova" },
      { name: "Ferizaj", code: "Ferizaj" },
    ],
    AL: [
      { name: "Tirana", code: "Tirana" },
      { name: "Durrës", code: "Durres" },
      { name: "Vlorë", code: "Vlore" },
      { name: "Shkodër", code: "Shkoder" },
      { name: "Elbasan", code: "Elbasan" },
    ],
    MK: [
      { name: "Skopje", code: "Skopje" },
      { name: "Bitola", code: "Bitola" },
      { name: "Kumanovo", code: "Kumanovo" },
      { name: "Tetovo", code: "Tetovo" },
      { name: "Ohrid", code: "Ohrid" },
    ],
  };

  const handleCountrySelect = (country: string, name: string) => {
    setSelectedCountry(country);
    setCountryName(name);
  };

  const handleCitySelect = (city: string) => {
    if (selectedCountry) {
      onSelect(selectedCountry, city);
    }
  };

  const handleBack = () => {
    setSelectedCountry(null);
  };

  if (!selectedCountry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary dark:from-background dark:to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Select Your Country</CardTitle>
            <CardDescription>
              Choose your country to get accurate prayer times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {countries.map((country) => (
                <Button
                  key={country.code}
                  variant="outline"
                  className="h-16 text-lg justify-start"
                  onClick={() => handleCountrySelect(country.code, country.name)}
                >
                  <span className="mr-2 text-2xl">{country.flag}</span>
                  <span>{country.name}</span>
                  <MapPin className="ml-auto h-5 w-5 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary dark:from-background dark:to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="absolute left-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl w-full">Select City in {countryName}</CardTitle>
          </div>
          <CardDescription>
            Choose your city to get the most accurate prayer times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {cities[selectedCountry as keyof typeof cities].map((city) => (
              <Button
                key={city.code}
                variant="outline"
                className="h-16 text-lg justify-start"
                onClick={() => handleCitySelect(city.code)}
              >
                <MapPin className="mr-2 h-5 w-5" />
                <span>{city.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}