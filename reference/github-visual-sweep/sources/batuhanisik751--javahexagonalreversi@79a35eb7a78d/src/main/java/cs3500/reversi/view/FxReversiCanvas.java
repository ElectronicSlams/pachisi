package cs3500.reversi.view;

import java.util.ArrayList;
import java.util.List;

import javafx.animation.Animation;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.util.Duration;

import cs3500.reversi.controller.ViewListener;
import cs3500.reversi.model.Coordinate;
import cs3500.reversi.model.IReadOnlyReversiModel;
import cs3500.reversi.model.Player;

/**
 * JavaFX Canvas-based panel for rendering the Reversi game board.
 * Delegates shape-specific rendering to an IShapeRenderer.
 */
class FxReversiCanvas extends Pane {
  // Keep these constants for backward compatibility with FxReversiView window sizing
  static final int HEX_SIZE = 40;
  static final double HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
  static final double HEX_HEIGHT = 1.5 * HEX_SIZE;

  private final IReadOnlyReversiModel model;
  private final FxTheme theme;
  private final Canvas canvas;
  private final IShapeRenderer renderer;
  private ViewListener viewListener;
  private int selectedRow = -1;
  private int selectedCol = -1;
  private int highlightPlacedRow = -1;
  private int highlightPlacedCol = -1;
  private List<Coordinate> highlightFlipped = new ArrayList<>();

  // Flip animation state
  private List<Coordinate> animatingCells = new ArrayList<>();
  private Color animFromColor;
  private Color animToColor;
  private double animProgress = 1.0;
  private Timeline flipTimeline;
  private boolean fastAnimation = false;

  /**
   * Constructs a new FxReversiCanvas with the specified model and theme.
   * @param model the Reversi model to render (read-only access).
   * @param theme the JavaFX color theme.
   */
  FxReversiCanvas(IReadOnlyReversiModel model, FxTheme theme) {
    this.model = model;
    this.theme = theme;
    this.canvas = new Canvas();
    this.renderer = createRenderer(model);
    getChildren().add(canvas);

    canvas.setOnMouseClicked(this::handleMouseClick);
    canvas.setOnMousePressed(this::handleMouseClick);

    this.setOnKeyPressed(this::handleKeyPress);
    this.setFocusTraversable(true);

    // Bind canvas size to pane size and redraw on resize
    canvas.widthProperty().bind(this.widthProperty());
    canvas.heightProperty().bind(this.heightProperty());
    this.widthProperty().addListener((obs, oldVal, newVal) -> draw());
    this.heightProperty().addListener((obs, oldVal, newVal) -> draw());
  }

  private static IShapeRenderer createRenderer(IReadOnlyReversiModel model) {
    String shapeName = model.getBoardShape().getShapeName();
    switch (shapeName) {
      case "square":
        return new SquareRenderer();
      case "triangular":
        return new TriangularRenderer();
      default:
        return new HexRenderer();
    }
  }

  /**
   * Sets the listener that receives user actions from this canvas.
   * @param listener the controller that handles moves and passes.
   */
  void setViewListener(ViewListener listener) {
    this.viewListener = listener;
  }

  /**
   * Sets the highlight state for the last move.
   * @param placedRow row of the placed piece, or -1 to clear.
   * @param placedCol column of the placed piece, or -1 to clear.
   * @param flipped list of coordinates of flipped pieces.
   */
  void setHighlights(int placedRow, int placedCol, List<Coordinate> flipped) {
    this.highlightPlacedRow = placedRow;
    this.highlightPlacedCol = placedCol;
    this.highlightFlipped = flipped;
  }

  void clearHighlights() {
    this.highlightPlacedRow = -1;
    this.highlightPlacedCol = -1;
    this.highlightFlipped = new ArrayList<>();
    if (flipTimeline != null) {
      flipTimeline.stop();
      flipTimeline = null;
    }
    animatingCells.clear();
    animProgress = 1.0;
  }

  /**
   * Sets whether animations should run at fast speed (for AI vs AI games).
   */
  void setFastAnimation(boolean fast) {
    this.fastAnimation = fast;
  }

  /**
   * Starts a flip animation on the given cells, transitioning from one color to another.
   * @param flipped the cells to animate.
   * @param fromColor the old piece color.
   * @param toColor the new piece color.
   */
  void startFlipAnimation(List<Coordinate> flipped, Color fromColor, Color toColor) {
    if (flipTimeline != null) {
      flipTimeline.stop();
    }
    if (flipped.isEmpty()) {
      draw();
      return;
    }

    this.animatingCells = new ArrayList<>(flipped);
    this.animFromColor = fromColor;
    this.animToColor = toColor;
    this.animProgress = 0.0;

    int durationMs = fastAnimation ? 50 : 300;
    int frameIntervalMs = 16;
    int totalFrames = Math.max(1, durationMs / frameIntervalMs);
    double progressPerFrame = 1.0 / totalFrames;

    flipTimeline = new Timeline(new KeyFrame(Duration.millis(frameIntervalMs), e -> {
      animProgress += progressPerFrame;
      if (animProgress >= 1.0) {
        animProgress = 1.0;
        flipTimeline.stop();
        animatingCells.clear();
      }
      draw();
    }));
    flipTimeline.setCycleCount(Animation.INDEFINITE);
    flipTimeline.play();
    draw();
  }

  private boolean isAnimatingCell(int row, int col) {
    for (Coordinate coord : animatingCells) {
      if (coord.getRow() == row && coord.getCol() == col) {
        return true;
      }
    }
    return false;
  }

  /**
   * Renders the entire board onto the canvas.
   */
  void draw() {
    GraphicsContext gc = canvas.getGraphicsContext2D();
    double w = canvas.getWidth();
    double h = canvas.getHeight();

    // Clear background
    gc.setFill(theme.boardBackground());
    gc.fillRect(0, 0, w, h);

    boolean isTriangular = renderer instanceof TriangularRenderer;
    TriangularRenderer triRenderer = isTriangular ? (TriangularRenderer) renderer : null;

    for (int r = 0; r < model.getBoard().size(); r++) {
      for (int c = 0; c < model.getRow(r).size(); c++) {
        double[] center = renderer.cellCenter(model, r, c);
        double centerX = center[0];
        double centerY = center[1];

        boolean isCursor = (r == selectedRow && c == selectedCol);
        boolean isSelected = isCursor && model.getSpace(r, c).isEmpty()
                && model.isValidMove(r, c, model.getCurrentTurn());
        boolean isPlaced = (r == highlightPlacedRow && c == highlightPlacedCol);
        boolean isFlipped = isHighlightedFlip(r, c);

        // Draw cell shape
        if (isTriangular) {
          triRenderer.drawTriangleCell(gc, model, r, c, theme,
                  isSelected, isCursor, isPlaced, isFlipped);
        } else {
          renderer.drawCell(gc, centerX, centerY, theme,
                  isSelected, isCursor, isPlaced, isFlipped);
        }

        // Draw pieces
        Player content = model.getSpaceContent(r, c);
        if (content != null) {
          double pieceR = renderer.pieceRadius();
          boolean isAnim = isAnimatingCell(r, c) && animProgress < 1.0;
          if (isAnim) {
            double scaleX = FlipAnimationUtils.computeFlipScaleX(animProgress);
            Color pieceColor = (animProgress < 0.5) ? animFromColor : animToColor;
            double pieceW = (pieceR * 2) * scaleX;
            double pieceH = pieceR * 2;
            gc.setFill(pieceColor);
            gc.fillOval(centerX - pieceW / 2.0, centerY - pieceH / 2.0, pieceW, pieceH);
          } else {
            gc.setFill(content == Player.BLACK ? theme.blackPiece() : theme.whitePiece());
            gc.fillOval(centerX - pieceR, centerY - pieceR, pieceR * 2, pieceR * 2);
          }
        }
      }
    }
  }

  private void handleMouseClick(MouseEvent e) {
    Coordinate coord = renderer.pixelToCoord(model, e.getX(), e.getY());
    if (coord != null) {
      selectedRow = coord.getRow();
      selectedCol = coord.getCol();
    }
    draw();
    this.requestFocus();
  }

  private void handleKeyPress(KeyEvent e) {
    KeyCode code = e.getCode();

    // Navigation keys work even without a listener
    switch (code) {
      case UP:
      case DOWN:
      case LEFT:
      case RIGHT:
        handleArrowKey(code);
        e.consume();
        return;
      case ESCAPE:
        selectedRow = -1;
        selectedCol = -1;
        draw();
        e.consume();
        return;
      default:
        break;
    }

    if (viewListener == null) {
      return;
    }
    // Ctrl+Z for undo
    if (code == KeyCode.Z && e.isControlDown()) {
      viewListener.onUndo();
      return;
    }
    switch (code) {
      case P:
        viewListener.onPass();
        break;
      case U:
        viewListener.onUndo();
        break;
      case S:
        viewListener.onSave();
        break;
      case L:
        viewListener.onLoad();
        break;
      case ENTER:
        viewListener.onMove(selectedRow, selectedCol);
        break;
      default:
        break;
    }
  }

  private void handleArrowKey(KeyCode direction) {
    Coordinate next = renderer.computeNextPosition(model, selectedRow, selectedCol, direction);
    selectedRow = next.getRow();
    selectedCol = next.getCol();
    draw();
  }

  /**
   * Computes the next cursor position given the current position and arrow key direction.
   * Static and package-private for testing without JavaFX initialization.
   */
  static Coordinate computeNextPosition(IReadOnlyReversiModel model,
                                        int curRow, int curCol, KeyCode direction) {
    IShapeRenderer r = createRenderer(model);
    return r.computeNextPosition(model, curRow, curCol, direction);
  }

  static int closestColInRow(IReadOnlyReversiModel model,
                             int fromRow, int fromCol, int toRow) {
    // Kept for backward compatibility; delegates to HexRenderer logic
    double hexWidth = Math.sqrt(3) * 40;
    double fromOffset = Math.abs((model.getBoardSize() - 1) - fromRow) * (hexWidth / 2);
    double toOffset = Math.abs((model.getBoardSize() - 1) - toRow) * (hexWidth / 2);
    double fromX = fromCol * hexWidth + fromOffset;
    double toCol = (fromX - toOffset) / hexWidth;
    int result = (int) Math.round(toCol);
    return Math.max(0, Math.min(result, model.getRow(toRow).size() - 1));
  }

  private boolean isHighlightedFlip(int row, int col) {
    for (Coordinate coord : highlightFlipped) {
      if (coord.getRow() == row && coord.getCol() == col) {
        return true;
      }
    }
    return false;
  }
}
