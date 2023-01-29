//
// Created by witherking25 on 1/10/23.
//

#include <filesystem>
#include <iostream>
#include "util.h"
#include "miniz_common.h"
#include "miniz_zip.h"


void* util::loadZippedFile(const std::string &path, size_t* size, std::string &unzippedFileName)
{
	mz_bool status;
	mz_zip_archive zip_archive;
	mz_zip_archive_file_stat file_stat;
	void* data;
	int file_count;

	memset(&zip_archive, 0, sizeof(zip_archive));

	status = mz_zip_reader_init_file(&zip_archive, path.c_str(), 0);
	if (!status)
	{
//		log_errno(logger, "opening", path.c_str());
		return NULL;
	}

	file_count = mz_zip_reader_get_num_files(&zip_archive);
	if (file_count == 0)
	{
		mz_zip_reader_end(&zip_archive);
//			logger->error(TAG "Empty zip file \"%s\"", path.c_str());
		return NULL;
	}

	if (file_count > 1)
	{
		mz_zip_reader_end(&zip_archive);
//			logger->error(TAG "Zip file \"%s\" contains %d files, determining which to open is not supported - returning entire zip file", path.c_str(), file_count);
		return loadFile(path, size);
	}

	if (mz_zip_reader_is_file_a_directory(&zip_archive, 0))
	{
		mz_zip_reader_end(&zip_archive);
//			logger->error(TAG "Zip file \"%s\" only contains a directory", path.c_str());
		return NULL;
	}

	if (!mz_zip_reader_file_stat(&zip_archive, 0, &file_stat))
	{
		mz_zip_reader_end(&zip_archive);
//			logger->error(TAG "Error opening file in \"%s\"", path.c_str());
		return NULL;
	}

	*size = (size_t) file_stat.m_uncomp_size;
	data = malloc(*size);

	status = mz_zip_reader_extract_to_mem(&zip_archive, 0, data, *size, 0);
	if (!status)
	{
		mz_zip_reader_end(&zip_archive);
//			log_errno(logger, "decompressing file in", path.c_str());
		free(data);
		return NULL;
	}

	unzippedFileName = file_stat.m_filename;
//		logger->info(TAG "Read %zu bytes from \"%s\":\"%s\"", *size, path.c_str(), file_stat.m_filename);
	mz_zip_reader_end(&zip_archive);
	return data;
}

void* util::loadFile(const std::string &path, size_t* size)
{
	FILE* file = fopen(path.c_str(), "rb");
	if (file == NULL)
		return NULL;

	fseek(file, 0, SEEK_END);
	*size = ftell(file);

	void* data = malloc(*size + 1);
	if (data == NULL)
	{
		fclose(file);
//		logger->error(TAG "Out of memory allocating %lu bytes to load \"%s\"", *size, path.c_str());
		return NULL;
	}

	fseek(file, 0, SEEK_SET);
	size_t numread = fread(data, 1, *size, file);
	fclose(file);

	if (numread < 0 || numread != *size)
	{
//		log_errno(logger, "reading", path.c_str());
		free(data);
		return NULL;
	}

	*((uint8_t*) data + *size) = 0;
//	logger->info(TAG "Read %zu bytes from \"%s\"", *size, path.c_str());
	return data;
}

std::filesystem::path util::unzip(const std::string &zipPath)
{
	char template_path[] = "/tmp/tmpdir.XXXXXX";
	std::string unzippedPath(mkdtemp(template_path));
	mz_zip_archive zip_archive;
	memset(&zip_archive, 0, sizeof(zip_archive));
	mz_zip_reader_init_file(&zip_archive, zipPath.c_str(), 0);
	std::string* default_file = nullptr;
	for (int i = 0; i < (int) mz_zip_reader_get_num_files(&zip_archive); i++)
	{
		mz_zip_archive_file_stat file_stat;
		if (!mz_zip_reader_file_stat(&zip_archive, i, &file_stat))
		{
			mz_zip_reader_end(&zip_archive);
			break;
		}
		if (default_file == nullptr && (std::filesystem::path(file_stat.m_filename).extension() == ".cue" || (i == 0 && (i + 1) == (int) mz_zip_reader_get_num_files(&zip_archive))))
		{
			default_file = new std::string(file_stat.m_filename);
		}
		else if (default_file == nullptr && i >= 1)
		{
			default_file = nullptr;
			break;
		}

		mz_zip_reader_extract_file_to_file(&zip_archive, file_stat.m_filename,
		                                            std::filesystem::path(unzippedPath.c_str()).append(
				                                            file_stat.m_filename).c_str(), 0);
	}
	mz_zip_reader_end(&zip_archive);
	std::filesystem::path ret;
	ret = std::filesystem::path(unzippedPath);
	if (default_file != nullptr)
	{
		ret = ret.append(default_file->c_str());
	}
	delete default_file;
	return ret;
}

bool util::unzipFile(const std::string &zipPath, const std::string &archiveFileName, const std::string &unzippedPath)
{
	mz_bool status;
	mz_zip_archive zip_archive;
	memset(&zip_archive, 0, sizeof(zip_archive));

	status = mz_zip_reader_init_file(&zip_archive, zipPath.c_str(), 0);
	if (!status)
	{
//		log_errno(logger, "opening", zipPath.c_str());
	}
	else
	{
		status = mz_zip_reader_extract_file_to_file(&zip_archive, archiveFileName.c_str(), unzippedPath.c_str(), 0);
		if (!status)
		{
//			log_errno(logger, "decompressing file in", zipPath.c_str());
		}
		else
		{
//			logger->error(TAG "Unzipped \"%s\" from \"%s\":\"%s\"", unzippedPath.c_str(), zipPath.c_str(), archiveFileName.c_str());
		}

		mz_zip_reader_end(&zip_archive);
	}

	return status;
}