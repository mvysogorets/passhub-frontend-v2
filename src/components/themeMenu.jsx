import { contextMenu, Menu, Item } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";
import { getUserData } from "../lib/userData";




const themes = ["theme-lite", "theme-dark", "theme-dark2", "theme-dark5", "theme-darkgreen"];


function switchTheme(theme) {

  document.querySelector("body").classList.remove(...themes);

  document.querySelector("body").classList.add(theme);
  if (theme == "theme-lite") {
    document.querySelector("body").removeAttribute("data-bs-theme");
  } else {
    document.querySelector("body").setAttribute("data-bs-theme", "dark");
  }

  axios
    .post(`${getApiUrl()}account.php`, {
      verifier: getVerifier(),
      operation: "theme",
      theme
    })
}

function ThemeMenu(props) {

  function onVisibilityChange(isVisible) {
    if (!isVisible) {
      props.onHidden();
    }
  }

  const classes = document.querySelector('body').classList;


  let currentTheme = "theme-lite";
  for (const c of classes) {
    if (c.substring(0, 6) == "theme-") {
      currentTheme = c;
    }
  }

  console.log(currentTheme);

  return (

    <Menu id={"theme-menu-id"} onVisibilityChange={onVisibilityChange}>
      {themes.map(t =>
        <Item
          onClick={() => switchTheme(t)}
          key={t.substring(6)}>
          {currentTheme == t ? (
            <span style={{ width: 24 }}>&#x2713;</span>
          ) : (<span style={{ width: 24 }}></span>)}
          {t.substring(6)}</Item>
      )}
    </Menu>

  )
}

export default ThemeMenu;
