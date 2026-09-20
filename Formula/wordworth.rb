class Wordworth < Formula
  desc "Context-aware English vocabulary coach for the terminal"
  homepage "https://github.com/frkntplglu/wordworth"
  url "https://github.com/frkntplglu/wordworth/archive/refs/tags/v0.1.0.tar.gz"
  version "0.1.0"

  depends_on "bun"

  def install
    system "bun", "install", "--no-save"
    system "bun", "build", "src/index.ts", "--compile", "--outfile", bin / "wordworth"
    (share / "wordworth").install "oxford_5000_simple.json"
  end

  test do
    assert_match "Wordworth", shell_output("#{bin}/wordworth --help")
  end
end
