import {
  BoxRenderable,
  createCliRenderer,
  InputRenderable,
  ScrollBoxRenderable,
  TextRenderable,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core";
import type {
  ProgressStage,
  WordworthError,
  WordworthResult,
} from "../domain/types.ts";

const COLORS = {
  background: "#0d1117",
  panel: "#151d27",
  panelMuted: "#111821",
  border: "#2d3a49",
  text: "#e6edf3",
  muted: "#8b9aab",
  accent: "#8bd5ca",
  gold: "#f6c177",
  danger: "#eb6f92",
};

export class TuiCancelledError extends Error {
  readonly code = "CANCELLED";

  constructor() {
    super("Context prompt cancelled.");
    this.name = "TuiCancelledError";
  }
}

export type TuiAction = "quit" | "new-word";

function text(
  renderer: CliRenderer,
  content: string,
  options: ConstructorParameters<typeof TextRenderable>[1] = {},
) {
  return new TextRenderable(renderer, { content, fg: COLORS.text, wrapMode: "word", ...options });
}

function panel(
  renderer: CliRenderer,
  title: string,
  content: string,
  options: ConstructorParameters<typeof BoxRenderable>[1] = {},
) {
  const box = new BoxRenderable(renderer, {
    border: true,
    borderStyle: "rounded",
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    paddingX: 2,
    paddingY: 1,
    title,
    titleColor: COLORS.accent,
    flexGrow: 0,
    ...options,
  });
  box.add(text(renderer, content));
  return box;
}

function clearRoot(renderer: CliRenderer) {
  for (const child of renderer.root.getChildren().slice()) {
    renderer.root.remove(child);
    child.destroyRecursively();
  }
}

function shell(
  renderer: CliRenderer,
  word: string,
  body: BoxRenderable | TextRenderable,
  footer = "q / Enter  close",
) {
  const root = renderer.root;
  const frame = new BoxRenderable(renderer, {
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 2,
    backgroundColor: COLORS.background,
  });
  frame.add(text(renderer, `WORDWORTH  /  ${word.toUpperCase()}`, {
    fg: COLORS.accent,
    attributes: 1,
    height: 1,
  }));
  frame.add(body);
  frame.add(text(renderer, footer, {
    fg: COLORS.muted,
    height: 1,
    marginTop: 1,
  }));
  root.add(frame);
}

export class TuiApp {
  private readonly rendererPromise: Promise<CliRenderer>;
  private cancelCurrent = () => undefined;
  private closeCurrent: (() => void) | null = null;
  private newWordCurrent: (() => void) | null = null;
  private escapeCurrent: (() => void) | null = null;
  private allowEnterToClose = false;
  private readonly handleGlobalSequence = (sequence: string) => {
    if (sequence === "\u0003") {
      this.handleSigint();
      return true;
    }
    if (sequence === "q" && this.closeCurrent) {
      this.closeCurrent();
      return true;
    }
    if (sequence === "n" && this.newWordCurrent) {
      this.newWordCurrent();
      return true;
    }
    if (sequence === "\u001b" && this.escapeCurrent) {
      this.escapeCurrent();
      return true;
    }
    if ((sequence === "\r" || sequence === "\n") && this.allowEnterToClose && this.closeCurrent) {
      this.closeCurrent();
      return true;
    }
    return false;
  };
  private readonly handleSigint = () => {
    this.cancelCurrent();
    void this.rendererPromise.then((renderer) => {
      if (!renderer.isDestroyed) renderer.destroy();
      process.exit(130);
    });
  };

  constructor() {
    this.rendererPromise = createCliRenderer({
      exitOnCtrlC: false,
      exitSignals: [],
      clearOnShutdown: true,
      backgroundColor: COLORS.background,
      prependInputHandlers: [this.handleGlobalSequence],
    });
    void this.rendererPromise.then((renderer) => {
      renderer.addInputHandler(this.handleGlobalSequence);
    });
    process.once("SIGINT", this.handleSigint);
  }

  private async renderer() {
    return this.rendererPromise;
  }

  async promptContext(word: string): Promise<string> {
    return this.promptValue(
      word,
      "Give Wordworth the sentence where you met this word.",
      "The context helps Jev judge whether this word is worth actively learning.",
      "Example: Her tenacious approach finally paid off.",
    );
  }

  async promptWord(): Promise<string> {
    return this.promptValue(
      "new word",
      "Choose another word to explore.",
      "Wordworth will start a fresh Oxford, Jev, and learning-material pass.",
      "Example: underpin",
    );
  }

  private async promptValue(
    header: string,
    title: string,
    description: string,
    placeholder: string,
  ): Promise<string> {
    const renderer = await this.renderer();
    clearRoot(renderer);
    const body = new BoxRenderable(renderer, {
      border: true,
      borderStyle: "rounded",
      borderColor: COLORS.border,
      backgroundColor: COLORS.panel,
      padding: 2,
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    });
    body.add(text(renderer, title, {
      fg: COLORS.text,
    }));
    body.add(text(renderer, description, {
      fg: COLORS.muted,
    }));
    const inputFrame = new BoxRenderable(renderer, {
      border: true,
      borderColor: COLORS.accent,
      backgroundColor: COLORS.panelMuted,
      width: "100%",
      height: 3,
      paddingX: 1,
    });
    const input = new InputRenderable(renderer, {
      placeholder,
      width: "100%",
      backgroundColor: COLORS.panelMuted,
      focusedBackgroundColor: "#1c2a34",
      focusedTextColor: COLORS.text,
    });
    inputFrame.add(input);
    body.add(inputFrame);
    shell(renderer, header, body, "Enter submit    •    Esc cancel");

    return new Promise((resolve, reject) => {
      let settled = false;
      const stdinCancelListener = (chunk: Buffer | string) => {
        if (Buffer.from(chunk).includes(3)) this.cancelCurrent();
      };
      renderer.stdin.on("data", stdinCancelListener);
      const destroyPoll = setInterval(() => {
        if (renderer.isDestroyed && !settled) {
          settled = true;
          clearInterval(destroyPoll);
          renderer.stdin.off("data", stdinCancelListener);
          reject(new TuiCancelledError());
        }
      }, 50);
      renderer.on("destroy", () => {
        if (!settled) {
          settled = true;
          clearInterval(destroyPoll);
          renderer.stdin.off("data", stdinCancelListener);
          reject(new TuiCancelledError());
        }
      });
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearInterval(destroyPoll);
        renderer.stdin.off("data", stdinCancelListener);
        this.cancelCurrent = () => undefined;
        this.closeCurrent = null;
        this.newWordCurrent = null;
        this.escapeCurrent = null;
        this.allowEnterToClose = false;
        callback();
      };
      this.cancelCurrent = () => {
        if (settled) return;
        settled = true;
        clearInterval(destroyPoll);
        renderer.destroy();
        reject(new TuiCancelledError());
      };
      this.escapeCurrent = this.cancelCurrent;
      const submitContext = () => {
        const value = input.value.trim();
        if (!value) return;
        finish(() => resolve(value));
      };
      input.on("enter", submitContext);
      input.onKeyDown = (key: KeyEvent) => {
        if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          key.preventDefault();
          key.stopPropagation();
          this.cancelCurrent();
        }
      };
      input.focus();
    });
  }

  async showProgress(word: string, context: string, stage: ProgressStage) {
    const renderer = await this.renderer();
    clearRoot(renderer);
    const body = new BoxRenderable(renderer, {
      border: true,
      borderStyle: "rounded",
      borderColor: COLORS.border,
      backgroundColor: COLORS.panel,
      padding: 2,
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    });
    body.add(text(renderer, `“${context}”`, { fg: COLORS.muted }));
    body.add(text(renderer, `◌  ${stage}…`, { fg: COLORS.gold, marginTop: 1 }));
    shell(renderer, word, body);
  }

  async showResult(result: WordworthResult) {
    const renderer = await this.renderer();
    clearRoot(renderer);
    const body = new ScrollBoxRenderable(renderer, {
      flexGrow: 1,
      scrollY: true,
      scrollX: false,
      viewportCulling: false,
      contentOptions: {
        flexDirection: "column",
        gap: 1,
        paddingBottom: 1,
      },
      verticalScrollbarOptions: {
        trackOptions: {
          backgroundColor: COLORS.panelMuted,
          foregroundColor: COLORS.accent,
        },
      },
    });
    body.add(text(renderer, `“${result.context}”`, { fg: COLORS.muted }));

    const priority = result.learningPriority
      ? result.learningPriority.score.toFixed(2)
      : "Oxford 5000 match\nJev skipped";
    const lookup = result.oxford.found
      ? `Oxford 5000  •  CEFR ${result.oxford.cefr}`
      : "Oxford 5000  •  not listed";
    const scorePanel = panel(renderer, "PRIORITY", `${priority}\n${lookup}`, {
      flexDirection: "column",
      minHeight: 5,
      borderColor: result.learningMaterial ? COLORS.accent : COLORS.gold,
    });
    body.add(scorePanel);

    if (result.learningMaterial) {
      body.add(panel(renderer, "DEFINITION", result.learningMaterial.definition));
      body.add(panel(renderer, "USAGE", result.learningMaterial.usage));
      body.add(panel(renderer, "EXAMPLE", result.learningMaterial.example));
    } else {
      body.add(panel(
        renderer,
        "NOTES",
        "This word scored below the active-learning threshold. Recognition is enough for now, so no learning material was generated.",
        { borderColor: COLORS.gold },
      ));
    }
    shell(renderer, result.word, body, "n new word    •    q / Esc quit");
    renderer.focusRenderable(body);
    return this.waitForClose(renderer, true);
  }

  async showError(word: string, error: WordworthError) {
    const renderer = await this.renderer();
    clearRoot(renderer);
    const body = panel(renderer, "ERROR", `${error.error.code}\n\n${error.error.message}`, {
      borderColor: COLORS.danger,
      flexGrow: 1,
    });
    shell(renderer, word || "wordworth", body);
    return this.waitForClose(renderer, true);
  }

  async close() {
    this.cancelCurrent = () => undefined;
    this.closeCurrent = null;
    this.newWordCurrent = null;
    this.escapeCurrent = null;
    this.allowEnterToClose = false;
    process.off("SIGINT", this.handleSigint);
    const renderer = await this.renderer();
    if (!renderer.isDestroyed) renderer.destroy();
  }

  private async waitForClose(renderer: CliRenderer, allowNewWord: boolean): Promise<TuiAction> {
    return new Promise<TuiAction>((resolve) => {
      const stdinCancelListener = (chunk: Buffer | string) => {
        if (Buffer.from(chunk).includes(3)) this.cancelCurrent();
      };
      renderer.stdin.on("data", stdinCancelListener);
      this.cancelCurrent = () => {
        this.cancelCurrent = () => undefined;
        this.closeCurrent = null;
        this.newWordCurrent = null;
        this.escapeCurrent = null;
        this.allowEnterToClose = false;
        renderer.stdin.off("data", stdinCancelListener);
        renderer.destroy();
        resolve("quit");
      };
      this.closeCurrent = this.cancelCurrent;
      this.escapeCurrent = this.cancelCurrent;
      this.allowEnterToClose = true;
      if (allowNewWord) {
        this.newWordCurrent = () => {
          this.cancelCurrent = () => undefined;
          this.closeCurrent = null;
          this.newWordCurrent = null;
          this.escapeCurrent = null;
          this.allowEnterToClose = false;
          renderer.stdin.off("data", stdinCancelListener);
          resolve("new-word");
        };
      }
      renderer.on("destroy", () => {
        renderer.stdin.off("data", stdinCancelListener);
        this.closeCurrent = null;
        this.newWordCurrent = null;
        this.escapeCurrent = null;
        this.allowEnterToClose = false;
        resolve("quit");
      });
      renderer.root.onKeyDown = (key: KeyEvent) => {
        if (key.name === "n" && allowNewWord && this.newWordCurrent) this.newWordCurrent();
        if (key.name === "q" || key.name === "enter" || key.name === "escape" || (key.ctrl && key.name === "c")) this.cancelCurrent();
      };
    });
  }
}
