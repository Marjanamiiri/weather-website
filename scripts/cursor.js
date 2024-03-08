const CURSOR_SPEED = 0.08;

let mouseX = 0;
let mouseY = 0;
let outlineX = 0;
let outlineY = 0;
let hoverButton = false;

const cursorOutline = document.getElementById("cursorOutline");

const animate = () => {
  let distX = mouseX - outlineX;
  let distY = mouseY - outlineY;

  outlineX = outlineX + distX * CURSOR_SPEED;
  outlineY = outlineY + distY * CURSOR_SPEED;

  cursorOutline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
  requestAnimationFrame(animate);
};

const handleMouseMove = (event) => {
  mouseX = event.pageX;
  mouseY = event.pageY;
};

const handleMouseOver = (event) => {
  const target = event.target;

  if (
    target.tagName.toLowerCase() === "button" ||
    target.parentElement.tagName.toLowerCase() === "button" ||
    target.tagName.toLowerCase() === "input" ||
    target.tagName.toLowerCase() === "textarea"
  ) {
    hoverButton = true;
  } else {
    hoverButton = false;
  }

  updateCursorStyle();
};

const updateCursorStyle = () => {
  cursorOutline.className = `cursor-outline ${hoverButton ? 'hover-button' : 'default-cursor'}`;
};

document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseover", handleMouseOver);

animate(); // Start animation loop

// Cleanup event listeners when needed
// document.removeEventListener("mousemove", handleMouseMove);
// document.removeEventListener("mouseover", handleMouseOver);