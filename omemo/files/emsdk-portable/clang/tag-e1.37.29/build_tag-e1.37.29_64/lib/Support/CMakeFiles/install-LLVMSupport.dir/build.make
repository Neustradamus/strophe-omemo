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

# Utility rule file for install-LLVMSupport.

# Include the progress variables for this target.
include lib/Support/CMakeFiles/install-LLVMSupport.dir/progress.make

lib/Support/CMakeFiles/install-LLVMSupport: lib/libLLVMSupport.a
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/Support && /usr/bin/cmake -DCMAKE_INSTALL_COMPONENT=LLVMSupport -P /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/cmake_install.cmake

install-LLVMSupport: lib/Support/CMakeFiles/install-LLVMSupport
install-LLVMSupport: lib/Support/CMakeFiles/install-LLVMSupport.dir/build.make

.PHONY : install-LLVMSupport

# Rule to build all files generated by this target.
lib/Support/CMakeFiles/install-LLVMSupport.dir/build: install-LLVMSupport

.PHONY : lib/Support/CMakeFiles/install-LLVMSupport.dir/build

lib/Support/CMakeFiles/install-LLVMSupport.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/Support && $(CMAKE_COMMAND) -P CMakeFiles/install-LLVMSupport.dir/cmake_clean.cmake
.PHONY : lib/Support/CMakeFiles/install-LLVMSupport.dir/clean

lib/Support/CMakeFiles/install-LLVMSupport.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/lib/Support /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/Support /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/Support/CMakeFiles/install-LLVMSupport.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : lib/Support/CMakeFiles/install-LLVMSupport.dir/depend

