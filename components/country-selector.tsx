"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowLeft, Globe } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CountrySelectorProps {
  onSelect: (country: string, city: string) => void
}

export default function CountrySelector({ onSelect }: CountrySelectorProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [countryName, setCountryName] = useState<string>("")

  const countries = [
    { code: "XK", name: "Kosovo", flag: "🇽🇰" },
    { code: "AL", name: "Albania", flag: "🇦🇱" },
    { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  ]

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
  }

  const handleCountrySelect = (country: string, name: string) => {
    setSelectedCountry(country)
    setCountryName(name)
  }

  const handleCitySelect = (city: string) => {
    if (selectedCountry) {
      onSelect(selectedCountry, city)
    }
  }

  const handleBack = () => {
    setSelectedCountry(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 dark:from-background dark:via-background dark:to-background/80 p-4">
      <AnimatePresence mode="wait">
        {!selectedCountry ? (
          <motion.div
            key="country-selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card className="border-none shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Select Your Country</CardTitle>
                <CardDescription>Choose your country to get accurate prayer times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {countries.map((country, index) => (
                    <motion.div
                      key={country.code}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Button
                        variant="outline"
                        className="h-16 text-lg justify-start w-full group hover:border-primary hover:bg-primary/5 transition-all duration-300"
                        onClick={() => handleCountrySelect(country.code, country.name)}
                      >
                        <span className="mr-3 text-2xl group-hover:scale-110 transition-transform duration-300">
                          {country.flag}
                        </span>
                        <span>{country.name}</span>
                        <MapPin className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="city-selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card className="border-none shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="absolute left-4 top-4 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Go back</span>
                </Button>
                <div className="pt-2">
                  <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Select City in {countryName}</CardTitle>
                  <CardDescription>Choose your city to get the most accurate prayer times</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {cities[selectedCountry as keyof typeof cities].map((city, index) => (
                    <motion.div
                      key={city.code}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Button
                        variant="outline"
                        className="h-16 text-lg justify-start w-full group hover:border-primary hover:bg-primary/5 transition-all duration-300"
                        onClick={() => handleCitySelect(city.code)}
                      >
                        <div className="mr-3 size-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                          <MapPin className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
                        </div>
                        <span>{city.name}</span>
                        <ArrowLeft className="ml-auto h-5 w-5 text-muted-foreground rotate-180 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

