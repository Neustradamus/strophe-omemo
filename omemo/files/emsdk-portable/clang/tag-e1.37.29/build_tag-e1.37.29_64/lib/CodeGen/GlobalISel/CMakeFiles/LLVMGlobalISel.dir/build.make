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
include lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/depend.make

# Include the progress variables for this target.
include lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/progress.make

# Include the compile flags for this target's objects.
include lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/flags.make

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/flags.make
lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/lib/CodeGen/GlobalISel/GlobalISel.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building CXX object lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/lib/CodeGen/GlobalISel/GlobalISel.cpp

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/lib/CodeGen/GlobalISel/GlobalISel.cpp > CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.i

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/lib/CodeGen/GlobalISel/GlobalISel.cpp -o CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.s

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.requires:

.PHONY : lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.requires

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.provides: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.requires
	$(MAKE) -f lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/build.make lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.provides.build
.PHONY : lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.provides

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.provides.build: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o


# Object files for target LLVMGlobalISel
LLVMGlobalISel_OBJECTS = \
"CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o"

# External object files for target LLVMGlobalISel
LLVMGlobalISel_EXTERNAL_OBJECTS =

lib/libLLVMGlobalISel.a: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o
lib/libLLVMGlobalISel.a: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/build.make
lib/libLLVMGlobalISel.a: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX static library ../../libLLVMGlobalISel.a"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel && $(CMAKE_COMMAND) -P CMakeFiles/LLVMGlobalISel.dir/cmake_clean_target.cmake
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel && $(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/LLVMGlobalISel.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/build: lib/libLLVMGlobalISel.a

.PHONY : lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/build

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/requires: lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/GlobalISel.cpp.o.requires

.PHONY : lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/requires

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel && $(CMAKE_COMMAND) -P CMakeFiles/LLVMGlobalISel.dir/cmake_clean.cmake
.PHONY : lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/clean

lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/lib/CodeGen/GlobalISel /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : lib/CodeGen/GlobalISel/CMakeFiles/LLVMGlobalISel.dir/depend

