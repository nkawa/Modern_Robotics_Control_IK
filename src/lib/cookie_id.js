"use client";

function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/**
 * クッキーを取得
 * @param {string} name クッキー名
 * @returns {string|undefined} 値（見つからなければ undefined）
 */
export function getCookie(name) {
  if (typeof document === "undefined") return undefined;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const entry of cookies) {
    const [k, ...rest] = entry.split("=");
    if (decodeURIComponent(k) === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return undefined;
}

/**
 * クッキーを設定
 * @param {string} name クッキー名
 * @param {string} value 値
 * @param {number} days 有効日数（デフォルト 365日）
 */
export function setCookie(name, value, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; expires=${expires.toUTCString()}; path=/`;
}

/**
 * クッキーを削除
 * @param {string} name クッキー名
 */
export function removeCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(
    name
  )}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const id_cookie = "sip3m_uuid";

// 外部で Cookie を設定できる仕組みが必要

function getOrSetUUID() {
  if(typeof window === "undefined") return undefined;
    if (!window.name) {// Tab毎にユニークなIDを生成
        window.name = Math.random().toString(36).slice(2, 9);
    }

    // UUIDを取得または新規生成
    let uuid = getCookie(id_cookie);
    if (!uuid) {
        uuid = generateUUID(); // crypto.randomUUID();
        setCookie(id_cookie, uuid, 365); // 1年間保存
    }
    let name = window.name;
    if (window.location.pathname.endsWith("/viewer/")) {
        name = name + "-viewer";
    }
    return uuid + "-" + name; // これで tab毎に違うIDとして使える。
}

// UUIDを取得または設定
export const userUUID = getOrSetUUID(); // これ、問題は同じブラウザだと同じIDになっちゃう
console.log("User UUID:", userUUID);