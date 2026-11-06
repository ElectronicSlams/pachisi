package com.noahvincenz.oware.view;

import com.noahvincenz.oware.controller.GameController;
import com.noahvincenz.oware.model.Board;
import com.noahvincenz.oware.model.GameState;
import com.noahvincenz.oware.model.MoveResult;
import javafx.animation.PauseTransition;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import javafx.util.Duration;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.noahvincenz.oware.model.OwareConstants.*;

public class GameBoardView {

    private final Stage stage;
    private final GameController controller;
    private final List<Button> houseButtons = new ArrayList<>();
    private Label playerOneScoreLabel;
    private Label playerTwoScoreLabel;
    private Label playerOneNameLabel;
    private Label playerTwoNameLabel;
    private Label turnIndicator;
    private boolean inputLocked = false;

    public GameBoardView(Stage stage, GameController controller) {
        this.stage = stage;
        this.controller = controller;
        buildView();
        updateDisplay();

        // if CPU goes first in single-player mode
        if (controller.isCpuTurn()) {
            performCpuMoveWithDelay();
        }
    }

    private void buildView() {
        BorderPane root = new BorderPane();

        // center: game board grid
        GridPane grid = buildGrid();
        grid.setAlignment(Pos.CENTER);
        grid.setHgap(6);
        grid.setVgap(6);
        root.setCenter(grid);
        root.getStyleClass().add("mainBackGround");

        // left: player 1 score
        VBox leftPanel = new VBox(5);
        leftPanel.setPadding(new Insets(10, 20, 10, 40));
        leftPanel.setAlignment(Pos.CENTER);
        playerOneNameLabel = new Label("Player 1");
        playerOneScoreLabel = new Label("0");
        applyScoreStyle(playerOneNameLabel);
        applyScoreStyle(playerOneScoreLabel);
        leftPanel.getChildren().addAll(playerOneNameLabel, playerOneScoreLabel);
        root.setLeft(leftPanel);

        // right: player 2 score
        VBox rightPanel = new VBox(5);
        rightPanel.setPadding(new Insets(10, 20, 10, 40));
        rightPanel.setAlignment(Pos.CENTER);
        playerTwoNameLabel = new Label("Player 2");
        playerTwoScoreLabel = new Label("0");
        applyScoreStyle(playerTwoNameLabel);
        applyScoreStyle(playerTwoScoreLabel);
        rightPanel.getChildren().addAll(playerTwoNameLabel, playerTwoScoreLabel);
        root.setRight(rightPanel);

        // top: turn indicator
        turnIndicator = new Label();
        turnIndicator.getStyleClass().add("scoreColor");
        turnIndicator.setStyle("-fx-font-size: 20px;");
        HBox topBox = new HBox(turnIndicator);
        topBox.setAlignment(Pos.CENTER);
        topBox.setPadding(new Insets(10, 0, 0, 0));
        root.setTop(topBox);

        // bottom: action buttons
        Button newGameButton = new Button("New Game");
        newGameButton.getStyleClass().add("buttonBottom");
        newGameButton.setOnAction(event -> returnToMenu());

        Button exitButton = new Button("Exit");
        exitButton.getStyleClass().add("buttonBottom");
        exitButton.setOnAction(event -> stage.close());

        HBox bottomButtons = new HBox(30, newGameButton, exitButton);
        bottomButtons.setAlignment(Pos.CENTER);
        bottomButtons.setPadding(new Insets(15, 12, 15, 12));
        root.setBottom(bottomButtons);

        Scene scene = new Scene(root, 1000, 500);
        String css = getClass().getResource("/com/noahvincenz/oware/styles/layout.css").toExternalForm();
        scene.getStylesheets().add(css);

        // keyboard shortcuts: 1-6 for houses, N for new game, Escape for menu
        scene.setOnKeyPressed(event -> {
            if (inputLocked) return;
            KeyCode code = event.getCode();
            if (code.isDigitKey()) {
                int digit = code.ordinal() - KeyCode.DIGIT1.ordinal() + 1;
                if (digit >= 1 && digit <= HOUSES_PER_PLAYER) {
                    handleKeyboardMove(digit);
                }
            } else if (code == KeyCode.N) {
                returnToMenu();
            } else if (code == KeyCode.ESCAPE) {
                returnToMenu();
            }
        });

        stage.setScene(scene);
        stage.setTitle("Oware");
        stage.setResizable(false);
        stage.show();
    }

    private GridPane buildGrid() {
        GridPane grid = new GridPane();

        // row labels
        Label p2Label = new Label("← P2");
        p2Label.getStyleClass().add("scoreColor");
        p2Label.setStyle("-fx-font-size: 14px;");
        grid.add(p2Label, HOUSES_PER_PLAYER, 0);

        Label p1Label = new Label("P1 →");
        p1Label.getStyleClass().add("scoreColor");
        p1Label.setStyle("-fx-font-size: 14px;");
        grid.add(p1Label, HOUSES_PER_PLAYER, 1);

        // player 2's houses (top row, displayed right-to-left: houses 11, 10, 9, 8, 7, 6)
        for (int i = 0; i < HOUSES_PER_PLAYER; i++) {
            int houseIndex = TOTAL_HOUSES - 1 - i;
            Button btn = createHouseButton(houseIndex);
            grid.add(btn, i, 0);
        }

        // player 1's houses (bottom row, displayed left-to-right: houses 0, 1, 2, 3, 4, 5)
        for (int i = 0; i < HOUSES_PER_PLAYER; i++) {
            int houseIndex = i;
            Button btn = createHouseButton(houseIndex);
            grid.add(btn, i, 1);
        }

        return grid;
    }

    private Button createHouseButton(int houseIndex) {
        Button btn = new Button("4");
        btn.setId(String.valueOf(houseIndex));
        btn.getStyleClass().add("num-button");
        btn.setOnAction(event -> handleButtonClick(houseIndex));

        // store in list at the correct index
        while (houseButtons.size() <= houseIndex) {
            houseButtons.add(null);
        }
        houseButtons.set(houseIndex, btn);

        return btn;
    }

    private void handleButtonClick(int houseIndex) {
        if (inputLocked) return;

        GameState gameState = controller.getGameState();
        if (gameState.getPhase() == GameState.Phase.GAME_OVER) return;

        Board board = gameState.getBoard();
        int currentPlayer = gameState.getCurrentPlayerIndex();

        // prevent clicking opponent's houses or empty houses
        if (!board.belongsTo(houseIndex, currentPlayer)) return;
        if (!board.isValidMove(currentPlayer, houseIndex)) return;

        MoveResult result = controller.handleHumanMove(houseIndex);
        if (!result.isValid()) return;

        highlightMove(houseIndex);
        updateDisplay();

        if (gameState.getPhase() == GameState.Phase.GAME_OVER) {
            showGameOver();
            return;
        }

        // in single-player, trigger CPU move after a short delay
        if (controller.isCpuTurn()) {
            performCpuMoveWithDelay();
        }
    }

    private void handleKeyboardMove(int digit) {
        GameState gameState = controller.getGameState();
        int currentPlayer = gameState.getCurrentPlayerIndex();

        // keys 1-6 map to the current player's houses
        int houseIndex;
        if (currentPlayer == 0) {
            houseIndex = digit - 1; // houses 0-5
        } else {
            houseIndex = HOUSES_PER_PLAYER + digit - 1; // houses 6-11
        }

        handleButtonClick(houseIndex);
    }

    private void performCpuMoveWithDelay() {
        inputLocked = true;
        PauseTransition pause = new PauseTransition(Duration.millis(500));
        pause.setOnFinished(event -> {
            MoveResult result = controller.performCpuMove();
            updateDisplay();
            inputLocked = false;
            if (controller.getGameState().getPhase() == GameState.Phase.GAME_OVER) {
                showGameOver();
            }
        });
        pause.play();
    }

    private void highlightMove(int houseIndex) {
        Button btn = houseButtons.get(houseIndex);
        btn.setStyle("-fx-background-color: rgba(255, 255, 255, 0.3); -fx-background-radius: 50%;");
        PauseTransition pause = new PauseTransition(Duration.millis(300));
        pause.setOnFinished(event -> btn.setStyle(""));
        pause.play();
    }

    private void updateDisplay() {
        GameState gameState = controller.getGameState();
        Board board = gameState.getBoard();
        List<Integer> seeds = board.getSeedCounts();

        for (int i = 0; i < TOTAL_HOUSES; i++) {
            if (houseButtons.get(i) != null) {
                houseButtons.get(i).setText(String.valueOf(seeds.get(i)));
            }
        }

        playerOneScoreLabel.setText(String.valueOf(gameState.getPlayer(0).getScore()));
        playerTwoScoreLabel.setText(String.valueOf(gameState.getPlayer(1).getScore()));

        // update turn indicator
        if (gameState.getPhase() == GameState.Phase.PLAYING) {
            String playerName = gameState.getCurrentPlayer().getName();
            if (controller.isCpuTurn()) {
                turnIndicator.setText("CPU is thinking...");
            } else {
                turnIndicator.setText(playerName + "'s turn");
            }
        } else {
            turnIndicator.setText("Game Over");
        }

        // enable/disable buttons based on whose turn it is
        updateButtonStates();
    }

    private void updateButtonStates() {
        GameState gameState = controller.getGameState();
        Board board = gameState.getBoard();
        int currentPlayer = gameState.getCurrentPlayerIndex();

        for (int i = 0; i < TOTAL_HOUSES; i++) {
            Button btn = houseButtons.get(i);
            if (btn == null) continue;

            if (gameState.getPhase() == GameState.Phase.GAME_OVER) {
                btn.setDisable(true);
            } else if (inputLocked) {
                btn.setDisable(true);
            } else {
                btn.setDisable(!board.isValidMove(currentPlayer, i));
            }
        }
    }

    private void showGameOver() {
        GameState gameState = controller.getGameState();
        int winnerIndex = gameState.getWinnerIndex();

        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Game Over");

        if (winnerIndex == -1) {
            alert.setHeaderText("It's a draw!");
        } else {
            String winnerName = gameState.getPlayer(winnerIndex).getName();
            if (controller.isSinglePlayer() && winnerIndex == controller.getCpuPlayerIndex()) {
                winnerName = "CPU";
            }
            alert.setHeaderText(winnerName + " wins!");
        }

        alert.setContentText("Player 1: " + gameState.getPlayer(0).getScore()
                + " | Player 2: " + gameState.getPlayer(1).getScore());

        ButtonType playAgain = new ButtonType("Play Again");
        ButtonType exitGame = new ButtonType("Exit");
        alert.getButtonTypes().setAll(playAgain, exitGame);

        Optional<ButtonType> result = alert.showAndWait();
        if (result.isPresent() && result.get() == playAgain) {
            returnToMenu();
        } else {
            stage.close();
        }
    }

    private void returnToMenu() {
        new MainMenuView(stage);
    }

    private void applyScoreStyle(Label label) {
        label.getStyleClass().add("scoreColor");
    }
}
