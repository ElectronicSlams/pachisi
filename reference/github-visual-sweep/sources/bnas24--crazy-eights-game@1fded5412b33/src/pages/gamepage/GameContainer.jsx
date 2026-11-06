import { useEffect, useRef, useState } from "react";
import * as gameLogic from "../../util/game_logic";
import { gameSetup } from "../../util/game_setup";
import { GamePres } from "./GamePres";

export const GameContainer = () => {
  // Ref variable for persisting state after components re-render
  const suitSelected = useRef(null);
  const cardInPile = useRef(null);
  const disableInteraction = useRef(false);

  // Imperatiive component states
  const [gameSetUp, setGameSetUp] = useState(true);
  const [deckState, setDeckState] = useState([]);
  const [isCrazyEight, setCrazyEight] = useState(false);
  const [cardState, setCardState] = useState({
    topCardInPile: {},
    userCardsInHand: [],
    computersCardsInHand: [],
    cardPileHistory: [],
    remainingCardsInDeck: null,
  });
  const [isGameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");

  // Import game logic for dynamic functionality
  const handleUsersTurn = gameLogic.handleUsersTurn;

  // Destructure functions from gameSetup module
  const { createDeck, shuffleArray } = gameSetup();

  // Game setup
  useEffect(() => {
    // Create deck of cards
    const deck = createDeck();

    // Shuffle deck of cards
    const shuffledDeck = shuffleArray(deck);

    // Distrubuting cards to the players and card pile from the shuffled deck
    const usersCards = shuffledDeck.splice(-8);
    const computersCards = shuffledDeck.splice(-8);
    const topCard = shuffledDeck.pop();

    // Updating cardState variable with its respective properties
    setCardState((prevState) => ({
      ...prevState,
      userCardsInHand: usersCards,
      computersCardsInHand: computersCards,
      topCardInPile: topCard,
      cardPileHistory: [topCard],
    }));

    // Set shuffled deck to the state
    setDeckState(shuffledDeck);

    cardInPile.current = topCard;

    setGameSetUp(false);
  }, []);

  // Update the remainingCardsInDeck state based on the length of the deckState array
  useEffect(() => {
    setCardState((prevState) => ({
      ...prevState,
      remainingCardsInDeck: deckState.length,
    }));
  }, [deckState]);

  // Reshuffle deck of cards when there are no more cards in the deckState array
  useEffect(() => {
    if (deckState.length === 0 && gameSetUp === false) {
      const reshuffledCards = shuffleArray(cardState.cardPileHistory);

      console.log("reshuffled cards", reshuffledCards);

      setDeckState(reshuffledCards);
    }
  }, [deckState, gameSetUp]);

  useEffect(() => {
    // Checks if a players hand ran out of cards
    if (
      (cardState.userCardsInHand.length === 0 ||
        cardState.computersCardsInHand.length === 0) &&
      gameSetUp === false
    ) {
      setGameOver(true);

      if (cardState.userCardsInHand.length === 0) {
        setWinner("You");
      } else if (cardState.computersCardsInHand.length === 0) {
        setWinner("Computer");
      }
    }
  }, [cardState, gameSetUp]);

  // Resets the whole game without refreshing the page
  const handleGameReset = (e, reason) => {
    // Prevent the default behavior of the click event
    e.preventDefault();
    // Stop the event from propagating to the Modal component
    e.stopPropagation();

    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }

    setCardState({
      topCardInPile: {},
      userCardsInHand: [],
      computersCardsInHand: [],
      cardPileHistory: [],
      remainingCardsInDeck: null,
    });
    suitSelected.current = null;
    cardInPile.current = null;
    disableInteraction.current = false;
    setWinner("");
    setGameOver(false);

    // Create deck of cards
    const newDeck = createDeck();

    // Shuffle deck of cards
    const newlyShuffledDeck = shuffleArray(newDeck);

    // Distrubuting cards to the players and card pile from the shuffled deck
    const usersCards = newlyShuffledDeck.splice(-8);
    const computersCards = newlyShuffledDeck.splice(-8);
    const topCard = newlyShuffledDeck.pop();

    // Updating cardState variable with its respective properties
    setCardState((prevState) => ({
      ...prevState,
      userCardsInHand: usersCards,
      computersCardsInHand: computersCards,
      topCardInPile: topCard,
      cardPileHistory: [topCard],
    }));

    // Set shuffled deck to the state
    setDeckState(newlyShuffledDeck);

    cardInPile.current = topCard;

    setGameSetUp(false);
  };

  return (
    <>
      <GamePres
        cardState={cardState}
        setCardState={setCardState}
        setDeckState={setDeckState}
        handleUserTurn={handleUsersTurn}
        setCrazyEight={setCrazyEight}
        isCrazyEight={isCrazyEight}
        suitSelected={suitSelected}
        cardInPile={cardInPile}
        deckState={deckState}
        disableInteraction={disableInteraction}
        isGameOver={isGameOver}
        handleGameReset={handleGameReset}
        winner={winner}
      />
    </>
  );
};
