// Phones and small touch screens get a lighter render: fewer pixels, no shadow
// pass and sparser weather, so the scene stays smooth on mobile GPUs.
export const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 640;
export const maxDpr = mobile ? 1.75 : 3;
