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

# Utility rule file for install-sancov.

# Include the progress variables for this target.
include tools/sancov/CMakeFiles/install-sancov.dir/progress.make

tools/sancov/CMakeFiles/install-sancov: bin/sancov
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/sancov && /usr/bin/cmake -DCMAKE_INSTALL_COMPONENT=sancov -P /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/cmake_install.cmake

install-sancov: tools/sancov/CMakeFiles/install-sancov
install-sancov: tools/sancov/CMakeFiles/install-sancov.dir/build.make

.PHONY : install-sancov

# Rule to build all files generated by this target.
tools/sancov/CMakeFiles/install-sancov.dir/build: install-sancov

.PHONY : tools/sancov/CMakeFiles/install-sancov.dir/build

tools/sancov/CMakeFiles/install-sancov.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/sancov && $(CMAKE_COMMAND) -P CMakeFiles/install-sancov.dir/cmake_clean.cmake
.PHONY : tools/sancov/CMakeFiles/install-sancov.dir/clean

tools/sancov/CMakeFiles/install-sancov.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/sancov /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/sancov /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/sancov/CMakeFiles/install-sancov.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : tools/sancov/CMakeFiles/install-sancov.dir/depend

