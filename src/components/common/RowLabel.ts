import { createContext, useContext } from "react";

/**
 * The visible label of the panel row a control sits in. Fields and menus
 * inside a row use it as their accessible name when none is passed.
 */
export const RowLabelContext = createContext<string | undefined>(undefined);

export const useRowLabel = () => useContext(RowLabelContext);
