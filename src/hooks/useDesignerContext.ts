import { useContext } from "react";
import { DesignerContext } from "../context/DesignerContext";

/**
 * Hook to access the designer context.
 * Throws an error if used outside of a `DesignerProvider`.
 */
export const useDesignerContext = () => {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error(
      "useDesignerContext must be used within a DesignerProvider"
    );
  }
  return context;
};