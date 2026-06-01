"use client";

import { useEffect } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { List, TextInput } from "@makeswift/runtime/controls";
import { setSearchPhrases } from "@/lib/search-phrases";

interface Props {
  phrases?: string[];
}

function SearchPhrases({ phrases = [] }: Props) {
  useEffect(() => {
    setSearchPhrases(phrases);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases.join("|")]);

  return null;
}

runtime.registerComponent(SearchPhrases, {
  type: "acme/search-phrases",
  label: "Layout & Slots / Search Typewriter Phrases",
  props: {
    phrases: List({
      label: "Additional phrases (typed after the default)",
      type: TextInput({ label: "Phrase", defaultValue: "Find by category, brand, or part number…" }),
    }),
  },
});
