import { NumericActionControl } from "./NumericActionControl";

export const ActionLetterSpacing = () => {
  return (
    <NumericActionControl
      showSteppers={false}
      orientation="horizontal"
      cssProperty="--letter-spacing"
      label="Spacing"
      defaultValue={1}
      units={["px", "rem", "em", ""]}
    />
  );
};
