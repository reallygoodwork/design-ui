import { NumericActionControl } from "./NumericActionControl";

export const ActionLetterSpacing = () => {
  return (
    <NumericActionControl
      cssProperty="--letter-spacing"
      label="Letter Spacing"
      defaultValue={1}
      units={["px", "rem", "em", ""]}
    />
  );
};
