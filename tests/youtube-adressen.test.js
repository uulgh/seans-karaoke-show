// Tests voor het herkennen van YouTube-links.  Draaien met:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { isVideoId, kijkadres, oembedAdres, videoIdUit } from "../extensie/youtube/youtube-adressen.js";

const ID = "dQw4w9WgXcQ";

const goed = [
  `https://www.youtube.com/watch?v=${ID}`,
  `https://www.youtube.com/watch?v=${ID}&list=PL123&index=2`,
  `https://www.youtube.com/watch?app=desktop&v=${ID}`,
  `https://youtube.com/watch?v=${ID}`,
  `https://m.youtube.com/watch?v=${ID}`,
  `https://music.youtube.com/watch?v=${ID}`,
  `http://www.youtube.com/watch?v=${ID}`,
  `https://youtu.be/${ID}`,
  `https://youtu.be/${ID}?t=42`,
  `https://www.youtube.com/embed/${ID}`,
  `https://www.youtube.com/live/${ID}?feature=share`,
];

for (const adres of goed) {
  test(`herkent de video in ${adres}`, () => {
    assert.equal(videoIdUit(adres), ID);
  });
}

const fout = [
  ["een zoekpagina", "https://www.youtube.com/results?search_query=karaoke"],
  ["een afspeellijst zonder video", "https://www.youtube.com/playlist?list=PL123"],
  ["een kanaal", "https://www.youtube.com/@voorbeeldkanaal"],
  ["een Short", `https://www.youtube.com/shorts/${ID}`],
  ["een te korte ID", "https://www.youtube.com/watch?v=abc"],
  ["een ID met rare tekens", "https://www.youtube.com/watch?v=<script>abc"],
  ["een andere site", `https://voorbeeld.nl/watch?v=${ID}`],
  ["een nepsite die op YouTube lijkt", `https://youtube.com.voorbeeld.nl/watch?v=${ID}`],
  ["een javascript-link", "javascript:alert(1)"],
  ["geen link", "hallo"],
  ["niets", ""],
  ["null", null],
];

for (const [naam, adres] of fout) {
  test(`weigert ${naam}`, () => {
    assert.equal(videoIdUit(adres), null);
  });
}

test("isVideoId keurt alleen 11 geldige tekens goed", () => {
  assert.equal(isVideoId(ID), true);
  assert.equal(isVideoId("abc"), false);
  assert.equal(isVideoId(`${ID}x`), false);
  assert.equal(isVideoId(12345678901), false);
  assert.equal(isVideoId(undefined), false);
});

test("kijkadres en oembedAdres maken de juiste links", () => {
  assert.equal(kijkadres(ID), `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(
    oembedAdres(ID),
    `https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${ID}`,
  );
});

// --- Spelervenster en achtergrondmuziek ---------------------------------------------

import { muziekadres, muziekUit, rustadres, speleradres } from "../extensie/youtube/youtube-adressen.js";

const LIJST = "PLabcdefghij1234567890";

test("speleradres en rustadres dragen het spelermerk", () => {
  assert.equal(speleradres(ID, 5), `https://www.youtube.com/watch?v=${ID}#karaoke-speler-nummer-5`);
  assert.equal(rustadres(7), "https://www.youtube.com/robots.txt#karaoke-speler-rust-7");
});

test("muziekUit herkent een video, een afspeellijst en allebei", () => {
  assert.deepEqual(muziekUit(`https://www.youtube.com/watch?v=${ID}`), { videoId: ID, lijstId: null });
  assert.deepEqual(muziekUit(`https://youtu.be/${ID}`), { videoId: ID, lijstId: null });
  assert.deepEqual(muziekUit(`https://www.youtube.com/watch?v=${ID}&list=${LIJST}`), { videoId: ID, lijstId: LIJST });
  assert.deepEqual(muziekUit(`https://www.youtube.com/playlist?list=${LIJST}`), { videoId: null, lijstId: LIJST });
  assert.deepEqual(muziekUit(`https://music.youtube.com/playlist?list=${LIJST}`), { videoId: null, lijstId: LIJST });
});

test("muziekUit weigert wat geen muzieklink is", () => {
  for (const adres of ["", "hallo", "https://voorbeeld.nl/playlist?list=" + LIJST, "https://www.youtube.com/", "https://www.youtube.com/playlist?list=<x>"]) {
    assert.equal(muziekUit(adres), null);
  }
});

test("muziekadres bouwt het afspeeladres, ook om verder te gaan waar de muziek was", () => {
  assert.equal(muziekadres({ videoId: ID, lijstId: null }, null, 1), `https://www.youtube.com/watch?v=${ID}#karaoke-speler-muziek-1`);
  assert.equal(
    muziekadres({ videoId: ID, lijstId: LIJST }, null, 1),
    `https://www.youtube.com/watch?v=${ID}&list=${LIJST}#karaoke-speler-muziek-1`,
  );
  assert.equal(
    muziekadres({ videoId: ID, lijstId: LIJST }, { videoId: "eeeeeeeeeee", tijd: 83 }, 1),
    `https://www.youtube.com/watch?v=eeeeeeeeeee&list=${LIJST}&t=83s#karaoke-speler-muziek-1`,
  );
  assert.equal(
    muziekadres({ videoId: null, lijstId: LIJST }, null, 1),
    `https://www.youtube.com/playlist?list=${LIJST}&playnext=1#karaoke-speler-muziek-1`,
  );
});
