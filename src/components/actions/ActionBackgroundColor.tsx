import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import { useEffect, useMemo, useState } from "react";
import { HslaStringColorPicker, RgbaStringColorPicker } from "react-colorful";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { DesignAction } from "../DesignAction";

extend([namesPlugin]);

const colorFormats = [
  { label: "rgba", value: "rgba" },
  { label: "hsla", value: "hsla" },
  { label: "hex", value: "hex" },
] as const;

type ColorFormat = (typeof colorFormats)[number]["value"];

/**
 * Converts a color string to the specified format
 */
const convertColorToFormat = (
  color: string | undefined,
  format: ColorFormat,
  fallback: string = "#ffffff"
): string => {
  if (!color) return fallback;

  const colorObj = colord(color);
  if (!colorObj.isValid()) return fallback;

  switch (format) {
    case "hex":
      return colorObj.toHex();
    case "rgba":
      return colorObj.toRgbString();
    case "hsla":
      return colorObj.toHslString();
    default:
      return fallback;
  }
};

/**
 * Validates if a color string matches the expected format
 */
const validateColorFormat = (color: string, format: ColorFormat): boolean => {
  if (!color.trim()) return true; // Allow empty for clearing

  const colorObj = colord(color);
  if (!colorObj.isValid()) return false;

  switch (format) {
    case "hex":
      // Hex should match #RRGGBB or #RRGGBBAA pattern
      return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(
        color.trim()
      );
    case "rgba":
      // RGBA should match rgba(r, g, b, a) pattern
      return /^rgba?\(/.test(color.trim());
    case "hsla":
      // HSLA should match hsla(h, s%, l%, a) pattern
      return /^hsla?\(/.test(color.trim());
    default:
      return false;
  }
};

export const ActionBackgroundColor = () => {
  const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
  const [inputValue, setInputValue] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean>(true);
  const selectedLayers = useSelectedLayers();
  const designerAction = useDesignerAction();
  const selectedLayer = selectedLayers[0];

  const rawColorValue = selectedLayer?.cssVars?.["--background-color"];
  const hasValue = Boolean(rawColorValue);

  // Get the color in the current format for display
  const formattedColor = useMemo(() => {
    return convertColorToFormat(rawColorValue, colorFormat);
  }, [rawColorValue, colorFormat]);

  // Get the color in the format needed for the color picker
  const pickerColor = useMemo(() => {
    if (!hasValue) {
      return colorFormat === "hsla" ? "hsla(0, 0%, 0%, 0)" : "rgba(0, 0, 0, 0)";
    }
    // Color pickers use rgba or hsla format
    if (colorFormat === "hsla") {
      return convertColorToFormat(rawColorValue, "hsla");
    }
    return convertColorToFormat(rawColorValue, "rgba");
  }, [rawColorValue, colorFormat, hasValue]);

  // Update input value when format or color changes
  useEffect(() => {
    setInputValue(formattedColor);
    setIsInputValid(true);
  }, [formattedColor]);

  const handleBackgroundColorChange = (newColor: string) => {
    if (selectedLayer) {
      // If empty, clear the color
      if (!newColor || !newColor.trim()) {
        designerAction({
          type: "UPDATE_LAYER_CSS",
          payload: {
            id: selectedLayer.id,
            css: { "--background-color": "" },
          },
        });
        return;
      }

      // Convert the color from the picker (rgba/hsla) to the selected format
      const convertedColor = convertColorToFormat(newColor, colorFormat);
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: {
          id: selectedLayer.id,
          css: { "--background-color": convertedColor },
        },
      });
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // If empty, allow clearing (don't validate empty)
    if (!value.trim()) {
      setIsInputValid(true);
      handleBackgroundColorChange("");
      return;
    }

    // Validate the input format
    const isValid = validateColorFormat(value, colorFormat);
    setIsInputValid(isValid);

    // Only update if valid
    if (isValid && selectedLayer) {
      // Convert to the format if needed (colord can handle conversion)
      const colorObj = colord(value);
      if (colorObj.isValid()) {
        // Store in the selected format
        const convertedColor = convertColorToFormat(value, colorFormat);
        handleBackgroundColorChange(convertedColor);
      }
    }
  };

  const handleFormatChange = (newFormat: ColorFormat) => {
    setColorFormat(newFormat);
    // Input value will be updated by the useMemo hook
  };

  const handleRemoveBackgroundColor = () => {
    if (selectedLayer) {
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: { id: selectedLayer.id, css: { "--background-color": "" } },
      });
    }
  };

  return (
    <DesignAction label="Background">
      <Popover.Root>
        <Popover.Trigger
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 justify-start bg-input text-input-foreground hover:bg-input/80 h-7 px-2 py-1 has-[>svg]:px-2 lowercase data-[empty=true]:text-muted-foreground tabular-nums max-w-28 w-fit flex-1 truncate"
          data-empty={!hasValue}
        >
          <span
            className={[
              "font-normal truncate",
              hasValue ? "text-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            {formattedColor}
          </span>
          <span
            className="ml-auto flex size-3 shrink-0 rounded-xs"
            style={{
              backgroundColor: hasValue
                ? selectedLayer?.cssVars?.["--background-color"]
                : "#ffffff",
            }}
          ></span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={104} side="left" align="start">
            <Popover.Popup className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-popover-content-transform-origin) rounded-lg border border-border/50 bg-background p-4 text-foreground shadow-lg outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
              <div className="flex flex-col gap-1 text-center sm:text-left">
                <Popover.Title className="font-semibold text-xs leading-none">
                  Background Color
                </Popover.Title>
              </div>
              <div className="shrink-0 bg-border h-px -mx-4 my-4 w-auto"></div>
              <div className="[&_div.react-colorful]:w-full! flex w-full flex-col gap-2">
                {colorFormat === "hsla" ? (
                  <HslaStringColorPicker
                    color={pickerColor}
                    onChange={handleBackgroundColorChange}
                  />
                ) : (
                  <RgbaStringColorPicker
                    color={pickerColor}
                    onChange={handleBackgroundColorChange}
                  />
                )}

                <div className="flex items-center gap-1">
                  <Input
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={
                      colorFormat === "hex"
                        ? "#ffffff"
                        : colorFormat === "rgba"
                        ? "rgba(255, 255, 255, 1)"
                        : "hsla(0, 0%, 100%, 1)"
                    }
                    aria-invalid={!isInputValid}
                    className={`flex h-7 w-full min-w-0 rounded-md border bg-input px-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                      isInputValid
                        ? "border-input"
                        : "border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                    }`}
                  />
                  <Select.Root
                    items={colorFormats}
                    value={colorFormat}
                    onValueChange={(value) =>
                      handleFormatChange(value as ColorFormat)
                    }
                  >
                    <Select.Trigger className="flex h-7 w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-md border border-transparent bg-input px-2 py-1 text-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:hover:bg-input/50 [&_svg:not([class*='size-'])]:size-3 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 flex-1">
                      <Select.Value />
                      <Select.Icon className="flex">
                        <IconChevronDown />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner
                        className="outline-none select-none z-10"
                        sideOffset={8}
                      >
                        <Select.Popup className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md duration-100 data-[state=closed]:animate-out data-[state=open]:animate-in data-[side=left]:-translate-x-1 data-[side=top]:-translate-y-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1">
                          <Select.List className="p-1  w-full min-w-[var(--anchor-width)] scroll-my-1">
                            {colorFormats.map(({ label, value }) => (
                              <Select.Item
                                key={label}
                                value={value}
                                className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-7 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-3 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2"
                              >
                                <Select.ItemIndicator className="absolute left-2 flex size-3.5 items-center justify-center">
                                  <IconCheck className="size-3" />
                                </Select.ItemIndicator>
                                <Select.ItemText>{label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Button
        onClick={handleRemoveBackgroundColor}
        disabled={!selectedLayer?.cssVars?.["--background-color"]}
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5"
      >
        <IconX />
      </Button>
    </DesignAction>
  );
};
