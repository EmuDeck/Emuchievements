//
// Created by witherking25 on 1/10/23.
//

#include <cstddef>
#include <string>

#pragma once

namespace util
{
	void* loadZippedFile(const std::string &path, size_t* size, std::string &unzippedFileName);

	void* loadFile(const std::string &path, size_t* size);

	bool unzipFile(const std::string &zipPath, const std::string &archiveFileName, const std::string &unzippedPath);

	std::filesystem::path unzip(const std::string &zipPath);
} // util