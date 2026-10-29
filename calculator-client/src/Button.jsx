import { useContext } from "react";

import ThemeContext from "./ThemeContext";
import { getButtonClasses } from "./buttonStyles";

function Button({ children, className = "", variant = "number", ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <button
      type="button"
      className={`${getButtonClasses(variant, theme)} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
