# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 3.5

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:


#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:


# Remove some rules from gmake that .SUFFIXES does not remove.
SUFFIXES =

.SUFFIXES: .hpux_make_needs_suffix_list


# Suppress display of executed commands.
$(VERBOSE).SILENT:


# A target that is always out of date.
cmake_force:

.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /usr/bin/cmake

# The command to remove a file.
RM = /usr/bin/cmake -E remove -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64

# Include any dependencies generated for this target.
include utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/depend.make

# Include the progress variables for this target.
include utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/progress.make

# Include the compile flags for this target's objects.
include utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/flags.make

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/flags.make
utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/utils/unittest/UnitTestMain/TestMain.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building CXX object utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/gtest_main.dir/TestMain.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/utils/unittest/UnitTestMain/TestMain.cpp

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/gtest_main.dir/TestMain.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/utils/unittest/UnitTestMain/TestMain.cpp > CMakeFiles/gtest_main.dir/TestMain.cpp.i

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/gtest_main.dir/TestMain.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/utils/unittest/UnitTestMain/TestMain.cpp -o CMakeFiles/gtest_main.dir/TestMain.cpp.s

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.requires:

.PHONY : utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.requires

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.provides: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.requires
	$(MAKE) -f utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/build.make utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.provides.build
.PHONY : utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.provides

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.provides.build: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o


# Object files for target gtest_main
gtest_main_OBJECTS = \
"CMakeFiles/gtest_main.dir/TestMain.cpp.o"

# External object files for target gtest_main
gtest_main_EXTERNAL_OBJECTS =

lib/libgtest_main.a: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o
lib/libgtest_main.a: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/build.make
lib/libgtest_main.a: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX static library ../../../lib/libgtest_main.a"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain && $(CMAKE_COMMAND) -P CMakeFiles/gtest_main.dir/cmake_clean_target.cmake
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain && $(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/gtest_main.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/build: lib/libgtest_main.a

.PHONY : utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/build

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/requires: utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/TestMain.cpp.o.requires

.PHONY : utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/requires

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain && $(CMAKE_COMMAND) -P CMakeFiles/gtest_main.dir/cmake_clean.cmake
.PHONY : utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/clean

utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/utils/unittest/UnitTestMain /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : utils/unittest/UnitTestMain/CMakeFiles/gtest_main.dir/depend

