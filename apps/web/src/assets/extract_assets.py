from PIL import Image

im = Image.open('bookui.jpg')
w, h = im.size
print(f"Original image size: {w}x{h}")

# 1. Capybara Hero (top right)
# In 736x1472, the hero sits roughly x: 420 to 720, y: 130 to 520
capybara_hero = im.crop((390, 130, 725, 520))
capybara_hero.save('apps/web/src/assets/capybara_reading.png')

# 2. Avatar (circle top right)
avatar = im.crop((646, 32, 706, 92))
avatar.save('apps/web/src/assets/avatar.png')

# 3. Continue Reading book cover ("The Little Prince" / "The Archive Chronicles")
# The card has a book cover on the left
continue_cover = im.crop((55, 400, 212, 615))
continue_cover.save('apps/web/src/assets/cover_archive.png')

# 4. Today's Goal illustration (coffee & books still life)
goal_illustration = im.crop((520, 660, 715, 800))
goal_illustration.save('apps/web/src/assets/goal_still_life.png')

# 5. Recommended book covers:
# Book 1: The Wind in the Willows
cover_wind = im.crop((34, 882, 203, 1112))
cover_wind.save('apps/web/src/assets/cover_wind.png')

# Book 2: The Secret Garden
cover_garden = im.crop((235, 882, 404, 1112))
cover_garden.save('apps/web/src/assets/cover_garden.png')

# Book 3: Charlotte's Web
cover_charlotte = im.crop((436, 882, 605, 1112))
cover_charlotte.save('apps/web/src/assets/cover_charlotte.png')

# Book 4: The Alchemist / Whispers of the Cartographer
cover_cartographer = im.crop((637, 882, 736, 1112))
cover_cartographer.save('apps/web/src/assets/cover_cartographer.png')

print("All visual assets extracted successfully!")
