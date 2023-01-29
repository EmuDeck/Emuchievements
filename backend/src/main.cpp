#include <iostream>
#include <filesystem>
#include <map>
#include <cstring>

#include "HashCHD.h"
#include "rc_hash.h"
#include "util.h"

std::string hash_file(const std::filesystem::path& path)
{
	char* buf = new char[33];

	auto* iterator = new rc_hash_iterator();

	std::string ext = path.extension();
	if (ext.length() == 4 && tolower(ext[1]) == 'z' && tolower(ext[2]) == 'i' && tolower(ext[3]) == 'p')
	{
		auto extracted = util::unzip(path.string());
		if (std::filesystem::is_regular_file(extracted))
		{
			std::string extracted_ext = extracted.extension();
			if (extracted_ext.length() == 4 && tolower(extracted_ext[1]) == 'c' && tolower(extracted_ext[2]) == 'h' && tolower(extracted_ext[3]) == 'd')
			{
				rc_hash_init_chd_cdreader();
			}
			else
			{
				rc_hash_init_default_cdreader();
			}

			rc_hash_initialize_iterator(iterator, extracted.c_str(), nullptr, 0);

			rc_hash_iterate(buf, iterator);

			rc_hash_destroy_iterator(iterator);
			std::filesystem::remove_all(extracted.parent_path());
		}
		else
		{
			rc_hash_initialize_iterator(iterator, path.c_str(), nullptr, 0);

			rc_hash_iterate(buf, iterator);

			rc_hash_destroy_iterator(iterator);
			std::filesystem::remove_all(extracted);
		}
	}
	else
	{
		if (ext.length() == 4 && tolower(ext[1]) == 'c' && tolower(ext[2]) == 'h' && tolower(ext[3]) == 'd')
		{
			rc_hash_init_chd_cdreader();
		}
		else
		{
			rc_hash_init_default_cdreader();
		}

		rc_hash_initialize_iterator(iterator, path.c_str(), nullptr, 0);

		rc_hash_iterate(buf, iterator);

		rc_hash_destroy_iterator(iterator);
	}
	std::string hash(buf);
	delete[] buf;
	delete iterator;
	return hash;
}

extern "C" const char* hash(const char* path)
{
	return hash_file(std::filesystem::path(path)).c_str();
}

int main(int argc, char** argv)
{
	if (argc != 2)
	{
		return 1;
	}

	std::filesystem::path path(argv[1]);
	std::cout << hash_file(path) << std::endl;
	return 0;
}