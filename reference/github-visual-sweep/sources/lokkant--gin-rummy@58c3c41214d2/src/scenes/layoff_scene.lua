-- Layoff scene (client): shown to BOTH players after a knock that is not a gin. The round is decided, so
-- every card is face up: at the top the knocker's melds (outlined) and leftover cards, at the bottom (where
-- our hand is on the table) the defender's hand, and the eye in its usual place. The
-- defender drags cards onto the melds to reduce their deadwood and presses FINISH; each placement goes to the
-- server at once (layoff_card) and the knocker sees the same card slide from the defender's hand onto the
-- meld (opponent_layoff). Both leave when the round_result arrives. load() gets the layoff_phase message
-- (protocol: top of server.lua). The scene is left with SceneManager.set("game"), so the game scene keeps
-- its state and then shows the round_result.

require 'card'
require 'cards_database'
require 'best_melds'
require 'shaders'

local love = require "love"
local network = require "network"
local ui = require "ui"
local felt = require "client/felt"
local layout = require "client/layout"
local sounds = require "client/sounds"
local eye = require "client/horror/eye"
local lamp = require "client/standard/lamp"
local unicorn = require "client/unicorn/unicorn"
local atmosphere = require "client/atmosphere"
local horror = require "client/horror"
local shadows = require "client/shadows"

local Scene = {}

-- "knocker" or "defender": the defender is the one who can move cards.
local role

-- The knocker's melds: each {cards = {Card, ...}, x, y, width, height}; the geometry is set by
-- compute_layout.
local melds = {}
-- The knocker's leftover cards, in the same shape as a meld (but nothing can be laid onto them).
local leftovers = {cards = {}}
-- The defender's hand as Card objects; laid off cards leave it. hand_meld_of[card] is the number of the
-- meld of the hand's best arrangement the card belongs to (nil for deadwood); it sets the outline colour.
local hand = {}
local hand_meld_of = {}

-- Drag state: the dragged card and where it was grabbed (and where the mouse was pressed, to tell a click
-- from a drag); hovered_card is the hand card under the cursor (it is enlarged); selected_card is the
-- hand card picked with a click: it stays lifted and a click on a meld lays it there.
local dragging_card
-- The hand card the mouse is held on and has not moved away from yet (a click when released, a drag once
-- the mouse moves).
local pressed_card
local drag_offset_x
local drag_offset_y
local drag_press_x
local drag_press_y
local hovered_card
local selected_card

-- A press that ends less than this many pixels from where it began is a click, a longer move is a drag.
local CLICK_DISTANCE = 6

-- The defender pressed FINISH: nothing can be moved any more while the score is counted.
local is_submitted = false
-- The scene was left (the game scene runs again); nothing is updated after that.
local is_left = false

-- Cards here are as big as on the table (1 = the same scale).
local CARD_SCALE_FACTOR = 1
-- Horizontal shift between neighbouring cards of a meld as a part of the card width; it shrinks (down to
-- MIN_MELD_OVERLAP) when the top row would not fit the window.
local MELD_OVERLAP = 0.55
local MIN_MELD_OVERLAP = 0.2
-- Gap between two groups (meld / leftovers) in the top row, as a part of the card width (at most
-- MAX_GROUP_GAP pixels).
local GROUP_GAP_FACTOR = 0.3
local MAX_GROUP_GAP = 60
-- Y of the top row.
local TOP_Y = 110
-- Hand cards are shifted by this part of the card width, like the hand on the table (2/3).
local HAND_OVERLAP = 1 / 1.5
-- A meld counts as hit by a drop when the cursor is within this many pixels of its rectangle.
local DROP_MARGIN = 25

local FINISH_COLOR = {0.3, 0.6, 0.3, 1}
-- The FINISH button (where the KNOCK button is on the table) and the gap between two groups of the top
-- row: both set by compute_layout.
local finish_button
local group_gap = MAX_GROUP_GAP

-- The eye (see client/horror/eye.lua) in the horror atmosphere, the lamp (client/standard/lamp.lua) in the
-- standard one, the unicorn (client/unicorn/unicorn.lua) in the unicorn one: awake / burning while the
-- defender can still move cards.
local eye_state
local lamp_state
local unicorn_state

local title_font
local label_font

-- Creates a textured card for a card name, at this scene's scale.
local function new_card(name)
    local card = get_card(name)
    local card_scale = layout.card_scale() * CARD_SCALE_FACTOR
    card:set_scale(card_scale, card_scale)
    return card
end

-- Creates the cards for a list of names, in the same order.
local function new_cards(names)
    local cards = {}
    for _, name in ipairs(names) do
        table.insert(cards, new_card(name))
    end
    return cards
end

-- Orders cards by rank and suit. Melds keep this order so a run reads left to right after a layoff.
local function sort_cards(cards)
    table.sort(cards, function(a, b) return a:is_lesser_than(b) end)
end

-- Calls fn(card) for every card of the scene: melds, leftovers, then the hand.
local function each_card(fn)
    for _, meld in ipairs(melds) do
        for _, card in ipairs(meld.cards) do fn(card) end
    end
    for _, card in ipairs(leftovers.cards) do fn(card) end
    for _, card in ipairs(hand) do fn(card) end
end

-- Arranges the hand like the player's own hand on the table: finds the best meld arrangement, puts the
-- melded cards first (meld 1, 2, 3, each sorted) and the deadwood after them by rank and suit, and
-- remembers which meld each card is in (hand_meld_of). Called whenever the hand changes.
local function arrange_hand()
    hand_meld_of = {}
    sort_cards(hand)
    if #hand == 0 then return end

    local arrangements = best_combinations(hand)
    for i, meld in ipairs(arrangements[1]) do
        for _, card in ipairs(meld) do
            hand_meld_of[card] = i
        end
    end

    table.sort(hand, function(a, b)
        -- Priority 4 puts deadwood after the (at most three) melds.
        local priority_a = hand_meld_of[a] or 4
        local priority_b = hand_meld_of[b] or 4

        if priority_a ~= priority_b then
            return priority_a < priority_b
        end

        return a:is_lesser_than(b)
    end)
end

-- Returns the width of the top row (all groups side by side) for a given overlap factor.
local function get_top_row_width(groups, card_w, overlap_factor)
    local width = group_gap * (#groups - 1)
    for _, group in ipairs(groups) do
        width = width + card_w * overlap_factor * (#group.cards - 1) + card_w
    end
    return width
end

-- Computes each card's target position; the movement itself happens smoothly in Scene.update via
-- card:move_to (this is also what makes a laid-off card fly onto its meld). Top row: the melds and then the
-- leftovers, centred; bottom row: the hand, where our hand is on the table.
local function compute_layout()
    local w = love.graphics.getWidth()
    local h = love.graphics.getHeight()

    local groups = {}
    for _, meld in ipairs(melds) do table.insert(groups, meld) end
    if #leftovers.cards > 0 then table.insert(groups, leftovers) end

    local sample = groups[1].cards[1]
    local card_w = sample:get_width()
    local card_h = sample:get_height()

    -- Squeeze the melds together until the whole row fits the window.
    group_gap = math.min(MAX_GROUP_GAP, card_w * GROUP_GAP_FACTOR)
    local overlap_factor = MELD_OVERLAP
    while overlap_factor > MIN_MELD_OVERLAP and
          get_top_row_width(groups, card_w, overlap_factor) > w - 80 do
        overlap_factor = overlap_factor - 0.05
    end

    local x = (w - get_top_row_width(groups, card_w, overlap_factor)) / 2
    for _, group in ipairs(groups) do
        group.x = x
        group.y = TOP_Y
        group.width = card_w * overlap_factor * (#group.cards - 1) + card_w
        group.height = card_h

        for j, card in ipairs(group.cards) do
            card.target_x = group.x + (j - 1) * card_w * overlap_factor
            card.target_y = group.y
        end

        x = x + group.width + group_gap
    end

    if #hand > 0 then
        local step = card_w * HAND_OVERLAP
        local start_x = (w - (step * (#hand - 1) + card_w)) / 2
        local hand_y = layout.get_hand_y(h)

        for i, card in ipairs(hand) do
            local target_y = hand_y
            -- The selected card is lifted by a sixth of its height.
            if card == selected_card then
                target_y = target_y - card:get_height() / 6
            end

            card.target_x = start_x + (i - 1) * step
            card.target_y = target_y
            -- rest_y is the position without the lift; hit testing uses it (see get_hand_card_at).
            card.rest_y = hand_y
        end
    end

    finish_button = layout.get_side_button(w, h)
end

-- Puts every card exactly on its target (used once after loading, so nothing flies in at the start).
local function snap_to_target()
    each_card(function(card)
        card:set_position(card.target_x, card.target_y)
    end)
end

-- True when no card is still sliding to its place.
local function are_cards_settled()
    local settled = true
    each_card(function(card)
        if card.x ~= card.target_x or card.y ~= card.target_y then
            settled = false
        end
    end)
    return settled
end

-- Returns the index of the knocker's meld under (x, y), or nil. The drop area is the meld's rectangle
-- enlarged by DROP_MARGIN to make dropping easier.
local function find_meld_at(x, y)
    for i, meld in ipairs(melds) do
        if x >= meld.x - DROP_MARGIN and x <= meld.x + meld.width + DROP_MARGIN and
           y >= meld.y - DROP_MARGIN and y <= meld.y + meld.height + DROP_MARGIN then
            return i
        end
    end
    return nil
end

-- Returns the hand card under (x, y), or nil. Like PlayerHand:get_card_at it tests the REST position
-- (rest_y), not the lifted one, so the lifted card does not flicker; `selected` is the picked card, which
-- also owns the strip it was lifted over.
local function get_hand_card_at(x, y, selected)
    for i = #hand, 1, -1 do
        local card = hand[i]
        if card.target_x and card.rest_y and
           x >= card.target_x and x <= card.target_x + card:get_width() and
           y >= card.rest_y and y <= card.rest_y + card:get_height() then
            return card
        end
    end

    if selected and selected.target_x and selected.rest_y then
        local lift = selected:get_height() / 6
        if x >= selected.target_x and x <= selected.target_x + selected:get_width() and
           y >= selected.rest_y - lift and y < selected.rest_y then
            return selected
        end
    end

    return nil
end

-- Moves `card` from the hand onto the end of meld `meld_index` (the layout then slides it there) and keeps
-- the meld in rank order. Returns false if the hand or the meld does not exist.
local function move_card_to_meld(card, meld_index)
    local meld = melds[meld_index]
    if meld == nil then return false end

    for i, hand_card in ipairs(hand) do
        if hand_card == card then
            table.remove(hand, i)
            break
        end
    end

    table.insert(meld.cards, card)
    sort_cards(meld.cards)
    arrange_hand()

    -- no longer in the hand: the lift above its place there means nothing now
    card.rest_y = nil

    -- any change of the hand puts the pick back
    selected_card = nil
    return true
end

-- Leaves the scene: the game scene continues with its own state and shows the outcome.
local function leave()
    is_left = true

    -- a correction that came too late must not rebuild the next layoff scene
    while network.take("layoff_sync") do end

    SceneManager.set("game")
end

-- The knocker's side: the defender laid `message.card` onto meld `message.meld_index`. The matching card
-- of the displayed defender's hand moves to the meld, which shows as a flight across the screen.
local function apply_opponent_layoff(message)
    for _, card in ipairs(hand) do
        if card.rank .. "_" .. card.suit == message.card then
            move_card_to_meld(card, message.meld_index)
            return
        end
    end
end

-- Scene entry, called by SceneManager.switch("layoff", layoff_phase_message) from the game scene.
-- Everything is rebuilt from scratch with fresh textured cards. `is_correction` (true when the server sent a
-- layoff_sync) keeps the eye as it is instead of closing it.
function Scene.load(info, is_correction)
    if title_font == nil then
        title_font = love.graphics.newFont("ArchivoBlack-Regular.ttf", 28)
        label_font = love.graphics.newFont("ArchivoBlack-Regular.ttf", 22)
    end

    role = info.role

    if eye_state == nil or not is_correction then
        eye_state = eye.create()
        lamp_state = lamp.create()
        unicorn_state = unicorn.create()
    end

    melds = {}
    for _, meld_names in ipairs(info.combinations) do
        table.insert(melds, {cards = new_cards(meld_names)})
    end
    for _, meld in ipairs(melds) do sort_cards(meld.cards) end

    leftovers = {cards = new_cards(info.knocker_deadwood)}
    sort_cards(leftovers.cards)

    hand = new_cards(info.defender_hand)
    arrange_hand()

    dragging_card = nil
    pressed_card = nil
    hovered_card = nil
    selected_card = nil
    is_submitted = false
    is_left = false

    compute_layout()
    snap_to_target()
end

-- Re-lays out after a window resize: the cards take the new scale and slide to their new places.
function Scene.resize()
    local card_scale = layout.card_scale() * CARD_SCALE_FACTOR
    each_card(function(card)
        card:set_scale(card_scale, card_scale)
    end)

    compute_layout()
end

-- Lays `card` onto meld `meld_index` if it extends that meld into a valid set or run: tells the server
-- (layoff_card) and moves the card there. Returns true when it was laid; otherwise the soft "no" sound plays.
local function try_lay_off(card, meld_index)
    if not can_extend_meld(card, melds[meld_index].cards) then
        sounds.play_failure()
        return false
    end

    network.send({type = "layoff_card", card = card.rank .. "_" .. card.suit, meld_index = meld_index})
    move_card_to_meld(card, meld_index)
    return true
end

-- Left button (defender only): FINISH, a click on a meld while a card is picked (lays that card there), or
-- the start of dragging a hand card (the topmost one under the cursor; if it does not move it is a click
-- that picks the card, see mousereleased).
function Scene.mousepressed(x, y, button)
    if button ~= 1 or is_submitted or is_left then return end

    -- The knocker has nothing to move: grabbing a card is an invalid move.
    if role ~= "defender" then
        if get_hand_card_at(x, y, nil) ~= nil then
            sounds.play_failure()
        end
        return
    end

    if ui.point_in_rect(x, y, finish_button) then
        sounds.play_click()
        is_submitted = true
        dragging_card = nil
        pressed_card = nil
        network.send({type = "finish_layoff"})
        return
    end

    local is_on_hand = get_hand_card_at(x, y, selected_card) ~= nil

    if selected_card ~= nil and dragging_card == nil and pressed_card == nil and not is_on_hand then
        local meld_index = find_meld_at(x, y)

        if meld_index ~= nil then
            try_lay_off(selected_card, meld_index)
            compute_layout()
            return
        end
    end

    if dragging_card == nil and pressed_card == nil then
        for i = #hand, 1, -1 do
            local card = hand[i]
            if card:mousepressed(x, y) then
                pressed_card = card
                drag_press_x, drag_press_y = x, y
                local cx, cy = card:get_position()
                drag_offset_x = x - cx
                drag_offset_y = y - cy
                break
            end
        end
    end
end

-- Releasing the button: a press that did not move is a click, which picks the card (or puts the pick back
-- when it was picked already) without the card ever being treated as dragged. Dropping a dragged card on a
-- meld that it extends into a valid set or run lays it there at once and tells the server (layoff_card);
-- otherwise it slides back to the hand. A meld that grew can be extended further by later cards.
function Scene.mousereleased(x, y, button)
    if button ~= 1 then return end

    local card = dragging_card or pressed_card
    if card == nil then return end

    local is_click = dragging_card == nil and
        math.sqrt((x - drag_press_x) ^ 2 + (y - drag_press_y) ^ 2) < CLICK_DISTANCE
    dragging_card = nil
    pressed_card = nil

    if is_click then
        selected_card = selected_card ~= card and card or nil
        sounds.play_card_select(selected_card ~= nil)
        -- the cursor is still on the card: it stays enlarged through the click
        hovered_card = card
    else
        local meld_index = find_meld_at(x, y)
        if meld_index ~= nil then try_lay_off(card, meld_index) end
    end

    compute_layout()
end

-- A press on a hand card turns into a drag once the mouse has moved CLICK_DISTANCE away; the dragged card
-- follows the cursor, keeping the grab offset.
function Scene.mousemoved(x, y)
    if pressed_card ~= nil and
       math.sqrt((x - drag_press_x) ^ 2 + (y - drag_press_y) ^ 2) >= CLICK_DISTANCE then
        dragging_card = pressed_card
        pressed_card = nil
    end

    if dragging_card then
        dragging_card:set_position(x - drag_offset_x, y - drag_offset_y)
    end
end

-- Per frame: hover, layout and card movement, then the network. The scene watches for the end of the round
-- (round_result, once the last card has landed) or of the game (game_over, connection lost) and returns to
-- the game scene, which shows the outcome. Its messages stay in the shared inbox for it.
function Scene.update(dt)
    if is_left then return end

    if dragging_card == nil and role == "defender" and not is_submitted then
        local mx, my = love.mouse.getPosition()
        local before = hovered_card
        hovered_card = get_hand_card_at(mx, my, selected_card)

        if hovered_card ~= nil and hovered_card ~= before then sounds.play_card_hover() end
    else
        hovered_card = nil
    end

    compute_layout()

    local eye_center = layout.get_eye_center(love.graphics.getWidth(), love.graphics.getHeight())
    local mouse_x, mouse_y = love.mouse.getPosition()
    eye.update(eye_state, dt, role == "defender" and not is_submitted, mouse_x, mouse_y, eye_center.x,
               eye_center.y, eye.get_pixel_size())
    lamp.update(lamp_state, dt, role == "defender" and not is_submitted, 0, false)
    unicorn.update(unicorn_state, dt, role == "defender" and not is_submitted)

    each_card(function(card)
        card:animate_zoom(dt, card == hovered_card, card == dragging_card)
        card:animate_tilt(dt, card == dragging_card)

        card:move_in_hand(dt, layout.get_card_speed(), layout.get_card_return_speed(), card.target_x,
                          card.target_y, card == dragging_card)

        -- the height above its place in the hand gives the shadow its distance
        card.lift = (card ~= dragging_card and card.rest_y) and math.max(0, card.rest_y - card.y) or 0
    end)

    network.poll()

    -- The defender's layoffs arrive as separate messages; the cards fly one after another.
    local message = network.take("opponent_layoff")
    while message do
        apply_opponent_layoff(message)
        message = network.take("opponent_layoff")
    end

    -- The server refused a layoff we had applied at once and sends the real melds and hands: the scene is
    -- built again from them (the last of several corrections is the one that counts).
    local correction = network.take("layoff_sync")
    while correction do
        local newer = network.take("layoff_sync")
        if newer == nil then
            Scene.load(correction, true)
            sounds.play_failure()
            return
        end
        correction = newer
    end

    if not network.is_connected() or network.has_message("game_over") then
        leave()
    elseif network.has_message("round_result") and are_cards_settled() then
        leave()
    end
end

-- Returns the number of the knocker's meld that holds `card`, or nil (the leftovers and the hand have none).
local function get_meld_index(card)
    for index, meld in ipairs(melds) do
        for _, meld_card in ipairs(meld.cards) do
            if meld_card == card then return index end
        end
    end
    return nil
end

-- Draws one card the way the table does: a melded card with the outline of its meld, any other card with the
-- plain shimmer; the hovered and the dragged card get their shine on top, and every card sways like on the
-- table (nervousness). Leaves the shader set (the callers reset it).
local function draw_card(card, meld_index, nervousness)
    -- the shadow goes first: it falls on the table and on the cards drawn before this one
    shadows.draw(card, true, nervousness)

    local time = love.timer.getTime()
    local is_special = card == hovered_card or card == dragging_card or card == selected_card

    if meld_index then
        local shader = is_special and highlight_hovered_card_shader or highlight_card_shader
        love.graphics.setShader(shader)
        shader:send("time", time)
        shader:send("highlight_color", combination_colors[meld_index])
    elseif card == dragging_card then
        love.graphics.setShader(dragging_card_shader)
        dragging_card_shader:send("time", time)
    elseif card == hovered_card or card == selected_card then
        love.graphics.setShader(hovered_card_shader)
        hovered_card_shader:send("time", time)
    else
        love.graphics.setShader(card_shader)
        card_shader:send("time", time)
    end

    card:draw(true, nervousness)
end

-- Draws the settled cards of a group (the dragged one is drawn last by Scene.draw).
local function draw_group(group, meld_index, nervousness)
    for _, card in ipairs(group.cards) do
        if card ~= dragging_card and card.x == card.target_x and card.y == card.target_y then
            draw_card(card, meld_index, nervousness)
        end
    end

    love.graphics.setShader()
end

-- Draws the table (both hands are open, so both are lit), the eye, the title, then the cards in the order of
-- the table: the knocker's melds and leftovers, the hand from left to right and the cards that are still
-- flying; the FINISH button for the defender comes next and the dragged card is drawn last, above everything.
function Scene.draw()
    felt.draw(felt.OPEN_LIGHTS, felt.OPEN_SPREAD)

    local eye_center = layout.get_eye_center(love.graphics.getWidth(), love.graphics.getHeight())
    local mode = atmosphere.get()

    if mode == "horror" then
        eye.draw(eye_state, eye_center.x, eye_center.y, eye.get_pixel_size())
    elseif mode == "unicorn" then
        unicorn.draw(unicorn_state, eye_center.x, eye_center.y, unicorn.get_pixel_size())
    else
        lamp.draw(lamp_state, eye_center.x, eye_center.y, lamp.get_pixel_size())
    end

    local w = love.graphics.getWidth()
    local title

    if role == "defender" then
        title = is_submitted and "Counting the score..." or "Drag your cards onto the melds to lay them off"
    else
        title = "Your opponent is laying off cards onto your melds..."
    end

    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.setFont(title_font)
    love.graphics.printf(title, 0, 30, w, "center")

    local nervousness = horror.multiplier("card_nervousness")

    for i, meld in ipairs(melds) do
        draw_group(meld, i, nervousness)
    end
    draw_group(leftovers, nil, nervousness)
    for _, card in ipairs(hand) do
        if card ~= dragging_card and card.x == card.target_x and card.y == card.target_y then
            draw_card(card, hand_meld_of[card], nervousness)
        end
    end
    love.graphics.setShader()

    -- Cards in flight are drawn over the settled ones.
    each_card(function(card)
        if card ~= dragging_card and (card.x ~= card.target_x or card.y ~= card.target_y) then
            draw_card(card, hand_meld_of[card] or get_meld_index(card), nervousness)
        end
    end)
    love.graphics.setShader()

    if role == "defender" and not is_submitted then
        love.graphics.setFont(label_font)
        ui.draw_button(finish_button, "FINISH", FINISH_COLOR)
    end

    -- The dragged card is above everything.
    if dragging_card ~= nil then
        draw_card(dragging_card, hand_meld_of[dragging_card], nervousness)
        love.graphics.setShader()
    end

    love.graphics.setColor(1, 1, 1, 1)
end

return Scene
