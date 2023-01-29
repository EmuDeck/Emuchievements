CXX = g++
CC = gcc
CXXFLAGS = -Wall -D__STDC_LIMIT_MACROS -DRC_DISABLE_LUA -std=c++17 -fPIC
CFLAGS = -D_7ZIP_ST -fPIC

OUTPUTDIR = ./out
MKDIR = mkdir -p $(OUTPUTDIR)
OBJECTC = redis.o

SRC_FOLDER = ./src

RC_SRC=./src/rcheevos/src/rcheevos
RC_URL_SRC=./src/rcheevos/src/rurl
RC_HASH_SRC=./src/rcheevos/src/rhash
RC_API_SRC=./src/rcheevos/src/rapi
CHD_SRC=./src/libchdr/src
LZMA_SRC=./src/libchdr/deps/lzma-22.01/src
ZLIB_SRC=./src/libchdr/deps/zlib-1.2.12
MINIZ_SRC=./src/miniz

INCLUDES = \
	-I$(SRC_FOLDER)/rcheevos/include  \
	-I$(SRC_FOLDER)/rcheevos/src/rhash  \
	-I$(SRC_FOLDER)/rcheevos/src/rapi  \
	-I$(SRC_FOLDER)/rcheevos/src/rcheevos  \
	-I$(SRC_FOLDER)/rcheevos/src/rurl \
	-I$(SRC_FOLDER)/libchdr/include \
	-I$(SRC_FOLDER)/libchdr/deps/lzma-22.01/include \
	-I$(SRC_FOLDER)/libchdr/deps/zlib-1.2.12 \
	-I$(SRC_FOLDER)/miniz

OBJS = \
	$(RC_SRC)/compat.o \
	$(RC_HASH_SRC)/cdreader.o \
	$(RC_HASH_SRC)/hash.o \
	$(RC_HASH_SRC)/md5.o \
    $(LZMA_SRC)/Alloc.o \
    $(LZMA_SRC)/Bra86.o \
    $(LZMA_SRC)/BraIA64.o \
    $(LZMA_SRC)/CpuArch.o \
    $(LZMA_SRC)/Delta.o \
    $(LZMA_SRC)/LzFind.o \
    $(LZMA_SRC)/Lzma86Dec.o \
    $(LZMA_SRC)/Lzma86Enc.o \
    $(LZMA_SRC)/LzmaDec.o \
    $(LZMA_SRC)/LzmaEnc.o \
    $(LZMA_SRC)/Sort.o \
	$(ZLIB_SRC)/adler32.o \
    $(ZLIB_SRC)/compress.o \
    $(ZLIB_SRC)/crc32.o \
    $(ZLIB_SRC)/deflate.o \
    $(ZLIB_SRC)/gzclose.o \
    $(ZLIB_SRC)/gzlib.o \
    $(ZLIB_SRC)/gzread.o \
    $(ZLIB_SRC)/gzwrite.o \
    $(ZLIB_SRC)/infback.o \
    $(ZLIB_SRC)/inffast.o \
    $(ZLIB_SRC)/inflate.o \
    $(ZLIB_SRC)/inftrees.o \
    $(ZLIB_SRC)/trees.o \
    $(ZLIB_SRC)/uncompr.o \
    $(ZLIB_SRC)/zutil.o \
	$(CHD_SRC)/libchdr_bitstream.o \
    $(CHD_SRC)/libchdr_cdrom.o \
    $(CHD_SRC)/libchdr_chd.o \
    $(CHD_SRC)/libchdr_flac.o \
    $(CHD_SRC)/libchdr_huffman.o \
    $(MINIZ_SRC)/miniz.o \
	$(MINIZ_SRC)/miniz_tdef.o \
	$(MINIZ_SRC)/miniz_tinfl.o \
	$(MINIZ_SRC)/miniz_zip.o \
	$(SRC_FOLDER)/main.o \
	$(SRC_FOLDER)/HashCHD.o \
	$(SRC_FOLDER)/util.o

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) $(LDFLAGS) -c $< -o $@

%.o: %.c
	$(CC) $(CFLAGS) $(INCLUDES) $(LDFLAGS) -c $< -o $@

all: build

build: $(OUTPUTDIR)/Emuchievements $(OUTPUTDIR)/Emuchievements.so

$(OUTPUTDIR)/Emuchievements: $(OBJS)
	$(MKDIR)
	$(CXX) -o $@ $+ $(LDFLAGS)
	chmod +x $(OUTPUTDIR)/Emuchievements

$(OUTPUTDIR)/Emuchievements.so: $(OBJS)
	$(MKDIR)
	$(CXX) -shared -o $@ $+ $(LDFLAGS)

.PHONY: clean
clean:
	$(RM) -rf $(OUTPUTDIR)
	$(RM) $(OBJS)
