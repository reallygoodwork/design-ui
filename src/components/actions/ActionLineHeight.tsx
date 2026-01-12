import { NumericActionControl } from "./NumericActionControl";

export const ActionLineHeight = () => {
  return (
    <NumericActionControl
      cssProperty="--line-height"
      label="Line Height"
      defaultValue={1}
      units={["px", "rem", "em", ""]}
    />
  );
};
