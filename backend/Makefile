CXX = g++
CC = gcc
CXXFLAGS = -Wall -D__STDC_LIMIT_MACROS -DRC_DISABLE_LUA -std=c++11

OUTPUTDIR = ./out
MKDIR = mkdir -p $(OUTPUTDIR)
OBJECTC = redis.o

SRC_FOLDER = ./src

RC_SRC=./src/rcheevos/src/rcheevos
RC_URL_SRC=./src/rcheevos/src/rurl
RC_HASH_SRC=./src/rcheevos/src/rhash
RC_API_SRC=./src/rcheevos/src/rapi

INCLUDES = \
	-I$(SRC_FOLDER)/rcheevos/include  \
	-I$(SRC_FOLDER)/rcheevos/src/rhash  \
	-I$(SRC_FOLDER)/rcheevos/src/rapi  \
	-I$(SRC_FOLDER)/rcheevos/src/rcheevos  \
	-I$(SRC_FOLDER)/rcheevos/src/rurl

CSOURCES = \
	$(RC_SRC)/compat.c \
	$(RC_HASH_SRC)/cdreader.c \
	$(RC_HASH_SRC)/hash.c \
	$(RC_HASH_SRC)/md5.c

CXXSOURCES = \
	$(SRC_FOLDER)/main.cpp

all: build

build:
	$(MKDIR)
	$(CXX) $(CSOURCES) $(CXXSOURCES) $(INCLUDES) -o $(OUTPUTDIR)/Emuchievements

.PHONY: clean
clean:
	$(RM) -rf $(OUTPUTDIR)
	$(RM) ./*.gc??
	$(RM) ./*.o
	$(RM) ./**/*.o
