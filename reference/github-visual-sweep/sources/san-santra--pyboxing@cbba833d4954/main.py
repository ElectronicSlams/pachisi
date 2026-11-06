# With help from: https://pythonprogramming.net/pygame-python-3-part-1-intro/ 

import pygame

import sys

window_W = 640
window_H = 480

done = False
is_blue = True
white = (255, 255, 255)
black = (0, 0, 0)
title_string = 'Py-Boxing'

numplayers = 2

def game_intro(screen, clock):
    '''
    Displays the Intro screen
    '''
    intro = True
    fps = 15

    while intro:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit(0)
            if event.type == pygame.KEYUP:
                intro = False

        screen.fill(white)
        display_text(screen, title_string, 70, window_W/2, window_H/4)
        display_text(screen, "Press any key to continue", 15, window_W/2, 3*window_H/4)

        
        pygame.display.update()
        clock.tick(fps)

def in_game(screen, clock, p_images):
    '''
    Main Game
    '''

    # parameter init
    fps = 30
    done = False
    time_lim = 120 #seconds
    step_size = 2
    hand_len = p_images[1][1].get_width()/2  # this length is wrong to be precise
    dist_thr = 700
    
    cpu_score = 0
    player_score = 0
    score_size = 30
    window_div = 20
    time_size = score_size
    start_ticks = pygame.time.get_ticks()

    # Position
    timer_pos = 3
    ring_pos = 5

    # player status
    # 0 -> pulled back
    # 1 -> right hand punch
    # 2 -> left hand punch
    # 3 -> got hit
    p_stat = [0, 0]
    user_p = 1
    opponent_p = 0

    # Player positions
    w_lim = (2*window_W/window_div, (window_div - 5)*window_W/window_div)
    h_lim = ((ring_pos+1)*window_H/window_div, (window_div - 1 - ring_pos)*window_H/window_div)

    # initial positions of the players
    p_pos = [[w_lim[0], h_lim[0]], [w_lim[1], h_lim[1]] ]

    
    while not done:
        # reset hand
        p_stat[user_p] = 0
        p_stat[opponent_p] = 0

        # loop handling the events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit(0)

            if event.type == pygame.KEYUP and event.key == pygame.K_SPACE:
                # PUNCH!
                p_stat[user_p] = 1

                # need to check if the punch has hit the opponent
                player_pos = p_pos[user_p]
                opponent_pos = p_pos[opponent_p]

                # stored as width and height
                if user_p == 1:
                    hand_pos_upd = [ -hand_len, -hand_len]
                else:
                    hand_pos_upd = [ hand_len, -hand_len]

                hand_pos = [player_pos[0] + hand_pos_upd[0], player_pos[1] + hand_pos_upd[1]]
                distance_sq = (hand_pos[0] - opponent_pos[0])**2 + (hand_pos[1] - opponent_pos[1])**2
                print distance_sq
                if distance_sq < dist_thr:
                    player_score += 1
                    p_stat[opponent_p] = 3

                    

        # now the movement handling
        keys = pygame.key.get_pressed()
        if keys[pygame.K_UP]:
            p_pos[user_p][1] -=  step_size
        if keys[pygame.K_DOWN]:
            p_pos[user_p][1] += step_size
        if keys[pygame.K_LEFT]:
            p_pos[user_p][0] -= step_size
        if keys[pygame.K_RIGHT]:
            p_pos[user_p][0] += step_size

        screen.fill(white)

        # main rendering
        # scores
        display_text(screen, str(cpu_score), score_size, window_W/window_div, window_H/window_div)
        display_text(screen, str(player_score), score_size, (window_div - 1)*window_W/window_div, window_H/window_div)

        # timer
        elapsed = (pygame.time.get_ticks() - start_ticks)/1000  # time elapsed in seconds
        rem = time_lim - elapsed
        rem_min = str(rem / 60)
        rem_sec = str(rem % 60).zfill(2)
        if rem == 0:
            done = True
        
        display_text(screen, str(rem_min)+":"+str(rem_sec), time_size, window_W/2, timer_pos*window_H/window_div)

        # The Ring
        pygame.draw.rect(screen, black,
                         pygame.Rect(window_W/window_div, ring_pos*window_H/window_div,
                                     (window_div - 2)*window_W/window_div,
                                     (window_div - 1 - ring_pos)*window_H/window_div),
                             2)

        # The players
        for i in range(numplayers):
            screen.blit(p_images[i][p_stat[i]], (p_pos[i][0], p_pos[i][1]))
        

        pygame.display.update()
        clock.tick(fps)

    return (cpu_score, player_score)


def game_over(screen, clock, cpu_score, player_score):
    '''
    Displays the game over screen
    '''

    # params
    done = False
    fps = 15

    title_font_size = 60
    msg_font_size = 30
    font_size = 30

    score_diff = player_score - cpu_score
    if score_diff > 0:
        game_txt = 'White Player wins'
    elif score_diff < 0:
        game_txt = 'Black Player wins'
    else:
        game_txt = 'Game Tied'
        

    while not done:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit(0)

            if event.type == pygame.KEYUP:
                # Press Enter to restart and anyother key to exit
                if event.key == pygame.K_KP_ENTER:
                    return False

                return True
            

        # display_text(screen, "Game Over", title_font_size, window_W/2, window_H/2)
        display_text(screen, game_txt, title_font_size, window_W/2, window_H/2)
        display_text(screen, 'Press Enter to Restart', msg_font_size, window_W/2, window_H/2 + 50)
        display_text(screen, 'Press any other key to exit', msg_font_size, window_W/2, window_H/2 +100)

        pygame.display.update()
        clock.tick(fps)
                

# helper functions
def text_objects(text, font):
    textSurface = font.render(text, True, black)
    return textSurface, textSurface.get_rect()

def display_text(screen, text, font_size, x, y):
    font = pygame.font.Font(pygame.font.get_default_font(), font_size)
    textSurf, textRect = text_objects(text, font)
    textRect.center = (x, y)
    screen.blit(textSurf, textRect)

if __name__=='__main__':
    # game init
    pygame.init()
    screen = pygame.display.set_mode((window_W, window_H))
    pygame.display.set_caption('pyboxing')

    clock = pygame.time.Clock()

    finish = False

    # load the figures
    numimg = 4
    p_images = [[], []]
    
    for p in xrange(numplayers):
        for i in xrange(numimg):
            p_images[p].append(pygame.image.load('p'+str(p+1)+'_'+str(i+1)+'.png'))

            
    while not finish:
        game_intro(screen, clock)
        (cpu_score, player_score) = in_game(screen, clock, p_images)
        finish = game_over(screen, clock, cpu_score, player_score)
        print finish
