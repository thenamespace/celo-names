// Offensive names that cannot be claimed

import { Hash, labelhash } from "viem";

const blacklist: string[] = [
  "fuck",
  "fucked",
  "fucking",
  "fucker",
  "shitcoin",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "slut",
  "cunt",
  "whore",
  "dick",
  "cock",
  "pussy",
  "faggot",
  "nigger",
  "kike",
  "spic",
  "chink",
  "retard",
  "kill",
  "murder",
  "suicide",
  "rape",
  "cum",
  "porn",
  "sex",
  "nsfw",
  "hitler",
  "nazi",
  "kkk",
  "terror",
  "bomb",
  "islamicstate",
  "pedophile",
  "pedophilia",
  "childporn",
  "bestiality",
  "necrophilia",
  "incest"
];

export const getBlackList = (): Hash[] => {

    const map: Record<string,boolean> = {};
    blacklist.forEach(listItem => {
        map[listItem] = true;
    })
    return Object.keys(map).map(listItem => labelhash(listItem))
}