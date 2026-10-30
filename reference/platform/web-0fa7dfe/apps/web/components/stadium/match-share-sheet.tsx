"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/stadium/sheet";
import { Button } from "@/components/ui";
import { boardFrameFromCells } from "@/lib/stadium/board";

export type MatchShareData = {
  readonly game: string;
  readonly gameSlug: string;
  readonly matchup: string;
  readonly headline: string;
  readonly message: string;
  readonly href: string;
  readonly board?: readonly string[] | null | undefined;
  readonly turn?: number | undefined;
  readonly visibility?: "public" | "followers" | "only_me";
};

/** Images are generated in the viewer's browser. Private hands and credentials never leave it. */
export function MatchShareSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: MatchShareData }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<{ url: string; blob: Blob; key: string } | null>(null);
  const [note, setNote] = useState("");
  const boardKey = JSON.stringify(data.board ?? []);
  const imageKey = JSON.stringify([boardKey,data.game,data.gameSlug,data.headline,data.matchup,data.turn]);
  const currentImage = image?.key === imageKey ? image : null;
  useEffect(() => {
    if (!canvas.current) return;
    const element = canvas.current;
    const context = element.getContext("2d");
    if (!context) return;
    let active = true;
    let url: string | null = null;
    const styles = getComputedStyle(document.documentElement);
    const color = (token: string) => styles.getPropertyValue(token).trim();
    context.fillStyle = color("--surface"); context.fillRect(0, 0, 1200, 630);
    context.fillStyle = color("--accent"); context.font = "600 32px sans-serif"; context.fillText("eSlams", 64, 90);
    context.fillStyle = color("--text"); context.font = "600 46px sans-serif";
    const words = data.headline.split(" "); let line = ""; let y = 200;
    for (const word of words) { const next = `${line} ${word}`.trim(); if (context.measureText(next).width > 530 && line) { context.fillText(line, 64, y); y += 58; line = word; } else line = next; }
    context.fillText(line, 64, y);
    context.font = "24px sans-serif"; context.fillStyle = color("--text-2");
    context.fillText(data.game, 64, 390);
    let matchupLine = ""; let matchupY = 432;
    for (const word of data.matchup.split(" ")) {
      const next = `${matchupLine} ${word}`.trim();
      if (context.measureText(next).width > 530 && matchupLine) { context.fillText(matchupLine, 64, matchupY, 530); matchupY += 32; matchupLine = word; }
      else matchupLine = next;
    }
    context.fillText(matchupLine, 64, matchupY, 530);
    context.font = "18px monospace"; context.fillText(data.turn === undefined ? "MATCH REPLAY · eslams.com" : `REPLAY STEP ${data.turn} · eslams.com`, 64, 558);
    const rawBoard: string[] = JSON.parse(boardKey);
    const frame = boardFrameFromCells(data.gameSlug, rawBoard);
    if (rawBoard.length && frame.kind === "cells") {
      const { rows, cols, cells: board } = frame;
      const size = Math.min(430 / cols, 430 / rows);
      const x0 = 686 + (430 - size * cols) / 2; const y0 = 100 + (430 - size * rows) / 2;
      const chess: Record<string,string> = {K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};
      const discs = frame.family !== "grid_3x3" && !frame.chess;
      for (let index = 0; index < board.length; index++) {
        const x = x0 + (index % cols) * size; const y = y0 + Math.floor(index / cols) * size;
        context.fillStyle = color(frame.chess ? ((Math.floor(index / cols) + index % cols) % 2 ? "--board-dark" : "--board-light") : "--surface-2");
        context.fillRect(x, y, size - 2, size - 2);
        if (discs) {
          context.beginPath(); context.arc(x + size / 2, y + size / 2, size * .44, 0, Math.PI * 2);
          context.fillStyle = color("--surface"); context.fill(); context.strokeStyle = color("--board-line"); context.stroke();
        }
        const cell = board[index] ?? "."; if (cell === ".") continue;
        if (discs) {
          context.beginPath(); context.arc(x + size / 2, y + size / 2, size * .35, 0, Math.PI * 2);
          context.fillStyle = color(cell === "R" ? "--accent" : cell === "B" ? "--stone-black" : "--stone-white"); context.fill();
          context.strokeStyle = color("--text-3"); context.lineWidth = 2; context.stroke(); context.lineWidth = 1;
        } else {
          context.fillStyle = color("--text"); context.font = `${Math.max(10,size * .63)}px sans-serif`; context.textAlign = "center"; context.textBaseline = "middle";
          context.fillText(frame.chess ? chess[cell] ?? cell : cell, x + size / 2, y + size / 2, size - 4);
        }
      }
      context.textAlign = "start"; context.textBaseline = "alphabetic";
    } else { context.fillStyle = color("--surface-2"); context.fillRect(686,100,430,430); context.fillStyle = color("--text-2"); context.font = "24px sans-serif"; context.fillText(data.game,716,300,360); context.font = "18px sans-serif"; context.fillText("Watch the recorded match",716,340,360); }
    element.toBlob((blob) => { if (!active || !blob) return; url = URL.createObjectURL(blob); setImage({url,blob,key:imageKey}); }, "image/png");
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [imageKey, boardKey, data.game, data.gameSlug, data.headline, data.matchup, data.turn]);
  const fullLink = () => new URL(data.href, window.location.origin).toString();
  const copy = async () => { try { await navigator.clipboard.writeText(`${data.message}\n${fullLink()}`); setNote("Message and replay link copied."); } catch { setNote("Select and copy the replay link below."); } };
  const share = async () => {
    try {
      const file = currentImage ? new File([currentImage.blob], "eslams-match.png", { type: "image/png" }) : null;
      const files = file && navigator.canShare?.({files:[file]}) ? [file] : undefined;
      if (navigator.share) await navigator.share({title:data.headline,text:data.message,url:fullLink(),...(files ? {files}: {})}); else await copy();
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setNote("Sharing is unavailable here. Copy the link or download the image."); }
  };
  return <Sheet open={open} onClose={onClose} title="Share your match" description={data.visibility && data.visibility !== "public" ? "The replay keeps its current visibility. This link does not make it public." : "A scoreline worth sharing. The link opens this exact match."}>
    <div className="st-share-preview"><canvas ref={canvas} width={1200} height={630} aria-label={`${data.headline}. ${data.matchup}. ${data.game}.`} /></div>
    <p className="st-share-message">{data.message}</p>
    <label className="st-share-link">Replay link<input readOnly value={data.href} onFocus={(event) => event.currentTarget.select()} /></label>
    <div className="st-share-actions"><Button onClick={copy} icon="copy">Copy message</Button><Button onClick={share} variant="primary" icon="upload">Share</Button>{currentImage ? <a className="btn btn-secondary" href={currentImage.url} download="eslams-match.png">Download image</a> : null}</div>
    <output aria-live="polite">{note}</output>
  </Sheet>;
}
