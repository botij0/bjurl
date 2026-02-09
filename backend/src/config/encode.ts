const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const encodeBase62 = (num: bigint) => {
  if (num === 0n) return "a";

  let result = "";
  while (num > 0n) {
    result += BASE62[Number(num % 62n)];
    num = num / 62n;
  }

  return result;
};
