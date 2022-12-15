#include <iostream>
#include <filesystem>
#include <map>
#include "rc_hash.h"

int main(int argc, char** argv)
{
	if (argc != 2)
	{
		return 1;
	}

//	std::map<std::string, int> console_map = {
//			{"megadrive", RC_CONSOLE_MEGA_DRIVE},
//			{"n64", RC_CONSOLE_NINTENDO_64},
//			{"snes", RC_CONSOLE_SUPER_NINTENDO},
//			{"gb", RC_CONSOLE_GAMEBOY},
//			{"gba", RC_CONSOLE_GAMEBOY_ADVANCE},
//			{"gbc", RC_CONSOLE_GAMEBOY_COLOR},
//			{"nes", RC_CONSOLE_NINTENDO},
//			{"pcengine", RC_CONSOLE_PC_ENGINE},
//			{"pcenginecd", RC_CONSOLE_PC_ENGINE_CD},
//			{"segacd", RC_CONSOLE_SEGA_CD},
//			{"sega32x", RC_CONSOLE_SEGA_32X},
//			{"mastersystem", RC_CONSOLE_MASTER_SYSTEM},
//			{"psx", RC_CONSOLE_PLAYSTATION},
//			{"lynx", RC_CONSOLE_ATARI_LYNX},
//			{"atarilynx", RC_CONSOLE_ATARI_LYNX},
//			{"ngp", RC_CONSOLE_NEOGEO_POCKET},
//			{"gamegear", RC_CONSOLE_GAME_GEAR},
//			{"gc", RC_CONSOLE_GAMECUBE},
//			{"gamecube", RC_CONSOLE_GAMECUBE},
//			{"atarijaguar", RC_CONSOLE_ATARI_JAGUAR},
//			{"atarijaguarcd", RC_CONSOLE_ATARI_JAGUAR_CD},
//			{"nds", RC_CONSOLE_NINTENDO_DS},
//			{"wii", RC_CONSOLE_WII},
//			{"wiiu", RC_CONSOLE_WII_U},
//			{"ps2", RC_CONSOLE_PLAYSTATION_2},
//			{"xbox", RC_CONSOLE_XBOX},
//			{"odyssey2", RC_CONSOLE_MAGNAVOX_ODYSSEY2},
//			{"pokemini", RC_CONSOLE_POKEMON_MINI},
//			{"atari2600", RC_CONSOLE_ATARI_2600},
//			{"pc", RC_CONSOLE_MS_DOS},
//			{"dos", RC_CONSOLE_MS_DOS},
//			{"arcade", RC_CONSOLE_ARCADE},
//			{"mame", RC_CONSOLE_ARCADE},
//			{"mame2003", RC_CONSOLE_ARCADE},
//			{"mame2010", RC_CONSOLE_ARCADE},
//			{"mame-advmame", RC_CONSOLE_ARCADE},
//			{"mamecurrent", RC_CONSOLE_ARCADE},
//			{"mame-mame4all", RC_CONSOLE_ARCADE},
//			{"virtualboy", RC_CONSOLE_VIRTUAL_BOY},
//			{"msx", RC_CONSOLE_MSX},
//			{"c64", RC_CONSOLE_COMMODORE_64},
//			{"zx81", RC_CONSOLE_ZX81},
//			{"oric", RC_CONSOLE_ORIC},
//			{"sg-1000", RC_CONSOLE_SG1000},
//			{"vic20", RC_CONSOLE_VIC20},
//			{"amiga", RC_CONSOLE_AMIGA},
//			{"atarist", RC_CONSOLE_ATARI_ST},
//			{"armstrad", RC_CONSOLE_AMSTRAD_PC},
//			{"apple2", RC_CONSOLE_APPLE_II},
//			{"saturn", RC_CONSOLE_SATURN},
//			{"dreamcast", RC_CONSOLE_DREAMCAST},
//			{"psp", RC_CONSOLE_PSP},
////			{"", RC_CONSOLE_CDI},
//			{"3do", RC_CONSOLE_3DO},
//			{"colecovision", RC_CONSOLE_COLECOVISION},
//			{"intellivision", RC_CONSOLE_INTELLIVISION},
//			{"vectrex", RC_CONSOLE_VECTREX},
//			{"pc88", RC_CONSOLE_PC8800},
//			{"pc98", RC_CONSOLE_PC9800},
//			{"pcfx", RC_CONSOLE_PCFX},
//			{"atari5200", RC_CONSOLE_ATARI_5200},
//			{"atari7800", RC_CONSOLE_ATARI_7800},
//			{"x68000", RC_CONSOLE_X68K},
//			{"wonderswan", RC_CONSOLE_WONDERSWAN},
//			{"wonderswancolor", RC_CONSOLE_WONDERSWAN},
////			{"", RC_CONSOLE_CASSETTEVISION},
////			{"", RC_CONSOLE_SUPER_CASSETTEVISION},
//			{"neogeocd", RC_CONSOLE_NEO_GEO_CD},
////			{"", RC_CONSOLE_FAIRCHILD_CHANNEL_F},
//			{"fmtowns", RC_CONSOLE_FM_TOWNS},
//			{"zxspectrum", RC_CONSOLE_ZX_SPECTRUM},
//			{"gameandwatch", RC_CONSOLE_GAME_AND_WATCH},
////			{"", RC_CONSOLE_NOKIA_NGAGE},
//			{"3ds", RC_CONSOLE_NINTENDO_3DS},
//			{"n3ds", RC_CONSOLE_NINTENDO_3DS},
//			{"supervision", RC_CONSOLE_SUPERVISION},
////			{"", RC_CONSOLE_SHARPX1},
//			{"tic80", RC_CONSOLE_TIC80},
////			{"", RC_CONSOLE_THOMSONTO8},
////			{"", RC_CONSOLE_PC6000},
//			{"pico8", RC_CONSOLE_PICO},
//			{"megaduck", RC_CONSOLE_MEGADUCK},
////			{"", RC_CONSOLE_ZEEBO}
//	};

	std::filesystem::path path(argv[1]);

	char* buf = new char[33];

	auto* iterator = new rc_hash_iterator();

	rc_hash_init_default_cdreader();

//	rc_hash_init_error_message_callback([](const char* error)
//	                                    {
//		std::cout << error << std::endl;
//										});

	rc_hash_initialize_iterator(iterator, path.c_str(), nullptr, 0);

	rc_hash_iterate(buf, iterator);

//	rc_hash_generate_from_file(buf, console_map[path.parent_path().filename().string()], path.c_str());

	rc_hash_destroy_iterator(iterator);

	std::string hash(buf);

	std::cout << hash << std::endl;

	delete[] buf;
	delete iterator;
	return 0;
}