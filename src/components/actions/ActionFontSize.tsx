import { NumericActionControl } from "./NumericActionControl";

export const ActionFontSize = () => {
  return (
    <NumericActionControl
      cssProperty="--font-size"
      label="Font Size"
      defaultValue={16}
      units={["px", "rem", "em"]}
      showSteppers={false}
      orientation="horizontal"
    />
  );
};
